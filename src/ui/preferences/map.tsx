import * as React from 'react'

import { DialogContent } from '../dialog'
import { Row } from '../layout'
import { TextBox } from '../form'

interface IMapProps {
  readonly url: string

  readonly onUrlChanged: (url: string) => void
}

export class Map extends React.Component<IMapProps, {}> {

  public render() {
    return (
      <DialogContent>
        <Row>
          <TextBox
            label="URL"
            value={this.props.url}
            onValueChanged={this.props.onUrlChanged}
            autoFocus={true}
          />
        </Row>
      </DialogContent>
    )
  }
}