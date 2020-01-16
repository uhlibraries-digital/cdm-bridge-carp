import * as React from 'react'
import { LinkButton } from '../button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Icons from "@fortawesome/free-solid-svg-icons"

interface IUpdateAvailableProps {
  readonly onDismissed: () => void
  readonly onUpdateNow: () => void
}

export class UpdateAvailable extends React.Component<IUpdateAvailableProps, {}> {

  public render() {
    return (
      <div className="update-available active">
        <FontAwesomeIcon
          icon={Icons.faCloudDownloadAlt}
          size="lg"
          className="icon"
        />

        <span>
          An updated version of CDM Bridge2Carp is available and will be
          installed at the next launch or{' '}
          <LinkButton onClick={this.onUpdateNow}>
            restart CDM Bridge2Carp now
          </LinkButton>.
        </span>

        <a className="close" onClick={this.onDismissed}>
          <FontAwesomeIcon
            icon={Icons.faTimes}
            size="lg"
          />
        </a>
      </div>
    )
  }

  private onUpdateNow = () => {
    this.props.onUpdateNow()
  }

  private onDismissed = () => {
    this.props.onDismissed()
  }
}