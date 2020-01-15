import * as React from 'react'
import * as classNames from 'classnames'
import { ExportButton } from './export-button'
import { ExportType } from '../../lib/export'

export type DropdownState = 'open' | 'closed'

interface IExportDropdownProps {
  readonly onSelectExport: (type: ExportType, download?: boolean) => void
  readonly dropdownState: DropdownState
  readonly dropdownStateChanged: (state: DropdownState) => void
  readonly disabled?: boolean
  readonly onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

export class ExportDropdown extends React.Component<IExportDropdownProps, {}> {
  private onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const newState: DropdownState =
      this.props.dropdownState === 'open' ? 'closed' : 'open'

    this.props.dropdownStateChanged(newState)
  }

  private get isOpen() {
    return this.props.dropdownState === 'open'
  }

  private handleOverlayClick = () => {
    this.props.dropdownStateChanged('closed')
  }

  private onFoldoutKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!event.defaultPrevented && this.isOpen && event.key === 'Escape') {
      event.preventDefault()
      this.props.dropdownStateChanged('closed')
    }
  }

  private renderDrowdown = (): JSX.Element | null => {
    if (this.props.dropdownState !== 'open') {
      return null
    }

    return (
      <div id="foldout-container">
        <div
          className="overlay"
          onClick={this.handleOverlayClick}
        />
        <div
          className="foldout"
          onKeyDown={this.onFoldoutKeyDown}
        >
          <ExportDropdownList
            onSelectExport={this.props.onSelectExport}
          />
        </div>
      </div>
    )

  }

  public render() {
    const className = classNames(this.props.dropdownState)
    return (
      <div
        className="export-titlebar"
      >
        {this.renderDrowdown()}
        <ExportButton
          className={className}
          disabled={this.props.disabled}
          onClick={this.onClick}
        />
      </div>
    )
  }
}

interface IExportDropdownListProps {
  readonly onSelectExport: (type: ExportType, download?: boolean) => void
}

export class ExportDropdownList extends React.Component<IExportDropdownListProps, {}> {

  private onExportMetadata = (event: React.MouseEvent<HTMLElement>) => {
    this.props.onSelectExport(ExportType.Metadata)
  }

  private onExportCarpProject = (event: React.MouseEvent<HTMLElement>) => {
    this.props.onSelectExport(ExportType.Carp)
  }

  public render() {
    return (
      <div
        className="export-list"
      >
        <div
          key="metadata"
          className="export-list-item"
          onClick={this.onExportMetadata}
        >
          Metadata Only
        </div>
        <div
          key="carp-project"
          className="export-list-item"
          onClick={this.onExportCarpProject}
        >
          Carpenters Project
        </div>
      </div>
    )
  }
}