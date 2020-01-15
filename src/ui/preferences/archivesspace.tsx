import * as React from 'react'

import { DialogContent } from '../dialog'
import { Row } from '../layout'
import { TextBox } from '../form'

interface IArchivesSpaceProps {
  readonly endpoint: string
  readonly username: string
  readonly password: string

  readonly onEndpointChanged: (endpoint: string) => void
  readonly onUsernameChanged: (username: string) => void
  readonly onPasswordChanged: (password: string) => void
}

export class ArchivesSpace extends React.Component<IArchivesSpaceProps, {}> {

  public render() {
    return (
      <DialogContent>
        <Row>
          <TextBox
            label="Endpoint"
            value={this.props.endpoint}
            onValueChanged={this.props.onEndpointChanged}
            autoFocus={true}
          />
        </Row>
        <Row>
          <TextBox
            label="Username"
            value={this.props.username}
            onValueChanged={this.props.onUsernameChanged}
          />
        </Row>
        <Row>
          <TextBox
            label="Password"
            value={this.props.password}
            onValueChanged={this.props.onPasswordChanged}
            type='password'
          />
        </Row>
      </DialogContent>
    )
  }
}