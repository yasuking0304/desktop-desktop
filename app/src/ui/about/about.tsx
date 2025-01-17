import * as React from 'react'

import { Row } from '../lib/row'
import { Button } from '../lib/button'
import {
  Dialog,
  DialogError,
  DialogContent,
  DefaultDialogFooter,
} from '../dialog'
import { LinkButton } from '../lib/link-button'
import { updateStore, IUpdateState, UpdateStatus } from '../lib/update-store'
import { Disposable } from 'event-kit'
import { Loading } from '../lib/loading'
import { RelativeTime } from '../relative-time'
import { assertNever } from '../../lib/fatal-error'
import { ReleaseNotesUri } from '../lib/releases'
import { encodePathAsUrl } from '../../lib/path'
import { t } from 'i18next'
import { isOSNoLongerSupportedByElectron } from '../../lib/get-os'

const logoPath = __DARWIN__
  ? 'static/logo-64x64@2x.png'
  : 'static/windows-logo-64x64@2x.png'
const DesktopLogo = encodePathAsUrl(__dirname, logoPath)

interface IAboutProps {
  /**
   * Event triggered when the dialog is dismissed by the user in the
   * ways described in the Dialog component's dismissible prop.
   */
  readonly onDismissed: () => void

  /**
   * The name of the currently installed (and running) application
   */
  readonly applicationName: string

  /**
   * The currently installed (and running) version of the app.
   */
  readonly applicationVersion: string

  /**
   * The currently installed (and running) architecture of the app.
   */
  readonly applicationArchitecture: string

  /** A function to call to kick off a non-staggered update check. */
  readonly onCheckForNonStaggeredUpdates: () => void

  readonly onShowAcknowledgements: () => void

  /** A function to call when the user wants to see Terms and Conditions. */
  readonly onShowTermsAndConditions: () => void
}

interface IAboutState {
  readonly updateState: IUpdateState
}

/**
 * A dialog that presents information about the
 * running application such as name and version.
 */
export class About extends React.Component<IAboutProps, IAboutState> {
  private updateStoreEventHandle: Disposable | null = null

  public constructor(props: IAboutProps) {
    super(props)

    this.state = {
      updateState: updateStore.state,
    }
  }

  private onUpdateStateChanged = (updateState: IUpdateState) => {
    this.setState({ updateState })
  }

  public componentDidMount() {
    this.updateStoreEventHandle = updateStore.onDidChange(
      this.onUpdateStateChanged
    )
    this.setState({ updateState: updateStore.state })
  }

  public componentWillUnmount() {
    if (this.updateStoreEventHandle) {
      this.updateStoreEventHandle.dispose()
      this.updateStoreEventHandle = null
    }
  }

  private onQuitAndInstall = () => {
    updateStore.quitAndInstallUpdate()
  }

  private renderUpdateButton() {
    if (__RELEASE_CHANNEL__ === 'development') {
      return null
    }

    const updateStatus = this.state.updateState.status

    switch (updateStatus) {
      case UpdateStatus.UpdateReady:
        return (
          <Row>
            <Button onClick={this.onQuitAndInstall}>
              {t('about.quit-and-install-update', 'Quit and Install Update')}
            </Button>
          </Row>
        )
      case UpdateStatus.UpdateNotAvailable:
      case UpdateStatus.CheckingForUpdates:
      case UpdateStatus.UpdateAvailable:
      case UpdateStatus.UpdateNotChecked:
        const disabled =
          ![
            UpdateStatus.UpdateNotChecked,
            UpdateStatus.UpdateNotAvailable,
          ].includes(updateStatus) || isOSNoLongerSupportedByElectron()

        const buttonTitle = t('about.check-for-updates', 'Check for Updates')

        return __LINUX__ ? (
          <></>
        ) : (
          <Row>
            <Button
              disabled={disabled}
              onClick={this.props.onCheckForNonStaggeredUpdates}
            >
              {buttonTitle}
            </Button>
          </Row>
        )
      default:
        return assertNever(
          updateStatus,
          `Unknown update status ${updateStatus}`
        )
    }
  }

  private renderCheckingForUpdate() {
    return (
      <Row className="update-status">
        <Loading />
        <span>{t('about.checking-for-updates', 'Checking for updates…')}</span>
      </Row>
    )
  }

  private renderUpdateAvailable() {
    return (
      <Row className="update-status">
        <Loading />
        <span>{t('about.downloading-updates', 'Downloading update…')}</span>
      </Row>
    )
  }

  private renderUpdateNotAvailable() {
    if (__LINUX__) {
      return null
    }
    const lastCheckedDate = this.state.updateState.lastSuccessfulCheck

    // This case is rendered as an error
    if (!lastCheckedDate) {
      return null
    }

    return (
      <p className="update-status">
        {t(
          'about.you-have-the-latest-version-1',
          `You have the latest version (last checked `
        )}
        <RelativeTime date={lastCheckedDate} />
        {t('about.you-have-the-latest-version-2', ')')}
      </p>
    )
  }

  private renderUpdateReady() {
    return (
      <p className="update-status">
        {t(
          'about.update-has-been-downloaded-and-is-ready',
          'An update has been downloaded and is ready to be installed.'
        )}
      </p>
    )
  }

  private renderUpdateDetails() {
    if (__LINUX__) {
      return null
    }

    if (__RELEASE_CHANNEL__ === 'development') {
      return (
        <p>
          The application is currently running in development and will not
          receive any updates.
        </p>
      )
    }

    const updateState = this.state.updateState

    switch (updateState.status) {
      case UpdateStatus.CheckingForUpdates:
        return this.renderCheckingForUpdate()
      case UpdateStatus.UpdateAvailable:
        return this.renderUpdateAvailable()
      case UpdateStatus.UpdateNotAvailable:
        return this.renderUpdateNotAvailable()
      case UpdateStatus.UpdateReady:
        return this.renderUpdateReady()
      case UpdateStatus.UpdateNotChecked:
        return null
      default:
        return assertNever(
          updateState.status,
          `Unknown update status ${updateState.status}`
        )
    }
  }

  private renderUpdateErrors() {
    if (__LINUX__) {
      return null
    }

    if (__RELEASE_CHANNEL__ === 'development') {
      return null
    }

    if (isOSNoLongerSupportedByElectron()) {
      return (
        <DialogError>
          {t(
            'about.no-longer-supported-operating-systems',
            `This operating system is no longer supported. Software updates have
              been disabled. `
          )}
          <LinkButton
            uri={t(
              'url.supported-operating-systems-for-github-desktop',
              'https://docs.github.com/en/desktop/installing-and-configuring-github-desktop/overview/supported-operating-systems'
            )}
          >
            {t(
              'about.supported-operating-systems',
              'Supported operating systems'
            )}
          </LinkButton>
        </DialogError>
      )
    }

    if (!this.state.updateState.lastSuccessfulCheck) {
      return (
        <DialogError>
          {t(
            'about.could-not-determine-the-last-time-update-check',
            `Couldn't determine the last time an update check was performed.
            You may be running an old version. Please try manually checking for
            updates and contact GitHub Support if the problem persists`
          )}
        </DialogError>
      )
    }

    return null
  }

  private renderBetaLink() {
    if (__RELEASE_CHANNEL__ === 'beta') {
      return
    }

    return (
      <div>
        <p className="no-padding">
          {t(
            'about.looking-for-the-latest-features',
            'Looking for the latest features?'
          )}
        </p>
        <p className="no-padding">
          {t('about.check-out-the-beta-channel-1', 'Check out the ')}
          <LinkButton uri="https://desktop.github.com/beta">
            {t('about.check-out-the-beta-channel-2', 'Beta Channel')}
          </LinkButton>
          {t('about.check-out-the-beta-channel-3', ' ')}
        </p>
      </div>
    )
  }

  public render() {
    const name = this.props.applicationName
    const version = this.props.applicationVersion
    const releaseNotesLink = (
      <LinkButton uri={ReleaseNotesUri}>
        {t('about.release-notes', 'release notes')}
      </LinkButton>
    )

    const versionText = __DEV__
      ? t('about.build', `Build {{0}}`, { 0: version })
      : t('about.version', `Version {{0}}`, { 0: version })
    const titleId = 'Dialog_about'

    return (
      <Dialog
        id="about"
        titleId={titleId}
        onSubmit={this.props.onDismissed}
        onDismissed={this.props.onDismissed}
      >
        {this.renderUpdateErrors()}
        <DialogContent>
          <Row className="logo">
            <img
              src={DesktopLogo}
              alt="GitHub Desktop"
              width="64"
              height="64"
            />
          </Row>
          <h1 id={titleId}>
            {t('about.about-name', 'About {{0}}', { 0: name })}
          </h1>
          <p className="no-padding">
            <span className="selectable-text">
              {versionText} ({this.props.applicationArchitecture})
            </span>{' '}
            ({releaseNotesLink})
          </p>
          <p className="no-padding terms-and-license">
            <LinkButton onClick={this.props.onShowTermsAndConditions}>
              {t('about.terms-and-conditions', 'Terms and Conditions')}
            </LinkButton>
          </p>
          <p className="terms-and-license">
            <LinkButton onClick={this.props.onShowAcknowledgements}>
              {t(
                'about.license-and-open-source-notices',
                'License and Open Source Notices'
              )}
            </LinkButton>
          </p>
          {this.renderUpdateDetails()}
          {this.renderUpdateButton()}
          {this.renderBetaLink()}
        </DialogContent>
        <DefaultDialogFooter />
      </Dialog>
    )
  }
}
