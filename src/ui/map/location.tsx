import { remote } from 'electron'
import * as React from 'react'
import * as classNames from 'classnames'

import { TextBox } from '../form'
import { Row } from '../layout'
import { Button } from '../button'

interface ILocationProp {
  readonly path?: string
  readonly label?: string
  readonly placeholder?: string
  readonly className?: string
  readonly onChange?: (path: string) => void
}

interface ILocationState {
  readonly path?: string
}

export class Location extends React.Component<ILocationProp, ILocationState> {

  public constructor(props: ILocationProp) {
    super(props)

    const path = this.props.path ? this.props.path : ''

    this.state = {
      path
    }
  }

  public componentWillReceiveProps(nextProps: ILocationProp) {
    this.setState({ path: nextProps.path })
  }

  public render() {
    const className = classNames('select-component', this.props.className)
    return (
      <Row className={className}>
        <TextBox
          value={this.state.path}
          label={this.props.label}
          placeholder={this.props.placeholder}
          onValueChanged={this.onPathChanged}
        />
        <Button onClick={this.showFilePicker}>Choose...</Button>
      </Row>
    )
  }

  private onPathChanged = async (path: string) => {
    this.setState({ path })
    if (this.props.onChange) {
      this.props.onChange(path)
    }
  }

  private showFilePicker = async () => {
    const directory: string[] | null = remote.dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (!directory) {
      return
    }

    const path = directory[0]
    this.setState({ path })
    if (this.props.onChange) {
      this.props.onChange(path)
    }
  }

}