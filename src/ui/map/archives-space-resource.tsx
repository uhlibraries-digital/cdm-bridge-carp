import * as React from 'react'
import * as classNames from 'classnames'
import { IResource } from '../../lib/archivesspace';

interface ArchviesSpaceResourceProp {
  readonly resources: ReadonlyArray<IResource>
  readonly selectedResource?: string
  readonly label?: string
  readonly labelClassName?: string
  readonly className?: string
  readonly onResouceChanged: (uri: string) => void
}

export class ArchviesSpaceResource extends React.Component<ArchviesSpaceResourceProp, {}> {

  private onChange = (event: React.FormEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value
    this.props.onResouceChanged(value)
  }

  public render() {
    const className = classNames('select-component', this.props.className)
    return (
      <div className={className}>
        {this.renderLabel()}
        <div className="selects">
          {this.renderSelects()}
        </div>
      </div>
    )
  }

  private renderLabel() {
    const label = this.props.label

    if (!label) {
      return null
    }

    return (
      <label
        className={this.props.labelClassName}
      >
        {label}
      </label>
    )
  }

  private renderSelects() {
    return (
      <select
        key="aspace-key"
        onChange={this.onChange}
        className='aspace-select-component'
        defaultValue={this.props.selectedResource}
      >
        <option key="aspace-none" value="">
          -- None --
        </option>
        {this.renderOptions()}
      </select>
    )
  }

  private renderOptions() {
    return this.props.resources.map((resource) => {
      return (
        <option
          key={resource.uri}
          value={resource.uri}
        >
          {resource.title}
        </option>
      )
    })
  }
}