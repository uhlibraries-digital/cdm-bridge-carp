import * as React from 'react'
import * as classNames from 'classnames'
import { ExportButton } from './export-button'
import { ExportType } from '../../lib/export'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as Icons from "@fortawesome/free-solid-svg-icons"

export type DropdownState = 'open' | 'closed'

interface IExportDropdownProps {
  readonly onSelectExport: (type: ExportType, download?: boolean) => void
  readonly loadingVocabulary: boolean
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
            loadingVocabulary={this.props.loadingVocabulary}
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
  readonly loadingVocabulary: boolean
}

export class ExportDropdownList extends React.Component<IExportDropdownListProps, {}> {

  private onExportMetadata = (event: React.MouseEvent<HTMLElement>) => {
    this.props.onSelectExport(ExportType.Metadata)
  }

  private onExportCarpProject = (event: React.MouseEvent<HTMLElement>) => {
    this.props.onSelectExport(ExportType.Carp)
  }

  private onExportVocabReport = (event: React.MouseEvent<HTMLElement>) => {
    this.props.onSelectExport(ExportType.Vocabulary)
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
        {this.renderVocabularyReport()}
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

  private renderVocabularyReport() {
    const loading = this.props.loadingVocabulary

    if (loading) {
      return (
        <div
          key="vocabulary"
          className="export-list-item"
          onClick={this.onExportVocabReport}
        >
          <div className="text">
            Vocabulary Report
          </div>
          <FontAwesomeIcon
            className="icon"
            icon={Icons.faSync}
            spin={true}
            size="lg"
          />
        </div>
      )
    }

    return (
      <div
        key="vocabulary"
        className="export-list-item"
        onClick={this.onExportVocabReport}
      >
        Vocabulary Report
      </div>
    )
  }
}