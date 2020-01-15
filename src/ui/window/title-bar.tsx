import * as React from 'react'

interface ITitleBarProps {

}

export class TitleBar extends React.Component<ITitleBarProps, {}> {
  public render() {
    return (
      <div id="app-title-bar">
        <h1>CDM Bridge2Carp</h1>
        {this.props.children}
      </div>
    )
  }
}