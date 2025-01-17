import * as React from 'react'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Banner } from './banner'
import { LinkButton } from '../lib/link-button'
import { setBoolean } from '../../lib/local-storage'
import { t } from 'i18next'

export const accessibilityBannerDismissed = 'accessibility-banner-dismissed'

interface IAccessibilitySettingsBannerProps {
  readonly onOpenAccessibilitySettings: () => void
  readonly onDismissed: () => void
}

export class AccessibilitySettingsBanner extends React.Component<IAccessibilitySettingsBannerProps> {
  private onDismissed = () => {
    setBoolean(accessibilityBannerDismissed, true)
    this.props.onDismissed()
  }

  private onOpenAccessibilitySettings = () => {
    this.props.onOpenAccessibilitySettings()
    this.onDismissed()
  }

  public render() {
    return (
      <Banner
        id="accessibility-settings-banner"
        dismissable={true}
        onDismissed={this.onDismissed}
      >
        <Octicon symbol={octicons.accessibilityInset} />
        <div className="banner-message">
          {t('accessibility-settings-banner.check-out-1', 'Check out the new')}{' '}
          <LinkButton onClick={this.onOpenAccessibilitySettings}>
            {t(
              'accessibility-settings-banner.accessibility-settings',
              'accessibility settings'
            )}
          </LinkButton>{' '}
          {t(
            'accessibility-settings-banner.check-out-2',
            'to control the visibility of the link underlines and diff check marks.'
          )}
        </div>
      </Banner>
    )
  }
}
