import * as React from 'react';
import { ipcRenderer, remote } from 'electron'
import { CSSTransitionGroup } from 'react-transition-group'

import { TitleBar } from './window';
import { CollectionView } from './collection'
import { MapView } from './map'
import { UiView } from './ui-view';
import { MenuEvent } from '../main/menu'
import { Dispatcher } from '../lib/dispatcher'
import { AppStore } from '../lib/stores'
import {
  IAppState,
  PopupType,
  FoldoutType,
  ViewType,
  Popup,
  IField,
  IUpdateState,
  UpdateStatus,
} from '../lib/app-state'
import { Preferences } from './preferences'
import { About } from './about'
import { ExportView, DropdownState, ExportDropdown } from './export'
import { CdmCollection, CdmFieldInfo } from '../lib/contentdm'
import { AppError } from './app-error'
import { ExportType } from '../lib/export';
import { IResource } from '../lib/archivesspace';
import { UpdateAvailable } from './updates'

interface IAppProps {
  readonly appStore: AppStore
  readonly dispatcher: Dispatcher
}

export const dialogTransitionEnterTimeout = 250
export const dialogTransitionLeaveTimeout = 100

export class App extends React.Component<IAppProps, IAppState> {

  public constructor(props: IAppProps) {
    super(props)

    props.dispatcher.loadInitialState()

    this.state = props.appStore.getState()
    props.appStore.onDidUpdate(state => {
      this.setState(state)
    })

    ipcRenderer.on(
      'menu-event',
      (event: Electron.IpcRendererEvent, { name }: { name: MenuEvent }) => {
        this.onMenuEvent(name)
      }
    )

    ipcRenderer.on(
      'update-changed',
      (event: Electron.IpcRendererEvent, { state }: { state: IUpdateState }) => {
        const status = state.status
        if (status === UpdateStatus.UpdateReady) {
          this.props.dispatcher.setUpdateAvailableVisibility(true)
        }
        this.props.dispatcher.setUpdateState(state)
      }
    )

    ipcRenderer.on(
      'update-error',
      (event: Electron.IpcRendererEvent, { error }: { error: Error }) => {
        this.props.dispatcher.setUpdateAvailableVisibility(false)
      }
    )
  }

  private onMenuEvent(name: MenuEvent): any {
    switch (name) {
      case 'show-preferences':
        return this.props.dispatcher.showPopup({ type: PopupType.Preferences })
      case 'show-about':
        return this.props.dispatcher.showPopup({ type: PopupType.About })
    }
  }

  private getPreferences(): any | null {
    const state = this.props.appStore.getState()
    return state.preferences
  }

  private getCollections(): ReadonlyArray<CdmCollection> {
    const state = this.props.appStore.getState()
    return state.collections
  }

  private getFields(): ReadonlyArray<IField> | null {
    const preferences = this.getPreferences()
    return preferences.fields
  }

  private getCollectionFieldInfo(): ReadonlyArray<CdmFieldInfo> | null {
    const state = this.props.appStore.getState()
    return state.collectionFieldInfo
  }

  private getCollectionAlias(): string {
    const state = this.props.appStore.getState()
    return state.selectedAlias
  }

  private getCollectionCrosswalk(): string {
    const state = this.props.appStore.getState()
    return state.crosswalk
  }

  private getArchivesSpaceResources(): ReadonlyArray<IResource> {
    const state = this.props.appStore.getState()
    return state.archivesSpaceResources
  }

  private onPopupDismissed = () => this.props.dispatcher.closePopup()

  private popupContent(): JSX.Element | null {
    const popup = this.state.currentPopup

    if (!popup) {
      return null
    }

    switch (popup.type) {
      case PopupType.Preferences:
        return (
          <Preferences
            dispatcher={this.props.dispatcher}
            preferences={this.state.preferences}
            defaultFields={this.state.defaultFields}
            onDismissed={this.onPopupDismissed}
          />
        )
      case PopupType.About:
        return (
          <About
            appName={remote.app.name}
            appVersion={remote.app.getVersion()}
            onDismissed={this.onPopupDismissed}
          />
        )
    }

    return null
  }

  private onExportDropdownChanged = (state: DropdownState) => {
    if (state === 'open') {
      this.props.dispatcher.showFoldout({ type: FoldoutType.Export })
    }
    else {
      this.props.dispatcher.closeFoldout()
    }
  }

  private onSelectExport = (type: ExportType, download?: boolean) => {
    this.props.dispatcher.export(type, download)
    this.props.dispatcher.closeFoldout()
  }

  private renderUpdateBanner() {
    if (!this.state.isUpdateAvailable) {
      return null
    }

    return (
      <UpdateAvailable
        onDismissed={this.onUpdateAvailableDismissed}
        onUpdateNow={this.onUpdateNow}
      />
    )
  }

  private renderPopup() {
    return (
      <CSSTransitionGroup
        transitionName="modal"
        component="div"
        transitionEnterTimeout={dialogTransitionEnterTimeout}
        transitionLeaveTimeout={dialogTransitionLeaveTimeout}
      >
        {this.popupContent()}
      </CSSTransitionGroup>
    )
  }

  private renderApp() {
    const state = this.state

    if (state.selectedView === ViewType.Export) {
      return (
        <UiView id="export-view">
          <ExportView
            dispatcher={this.props.dispatcher}
            progress={state.exportProgress}
            error={state.exportError}
            done={state.exportDone}
          />
        </UiView>
      )
    }

    return (
      <UiView id="collections">
        <CollectionView
          sidebarWidth={state.sidebarWidth}
          dispatcher={this.props.dispatcher}
          collections={this.getCollections()}
          alias={this.getCollectionAlias()}
        />
        <MapView
          dispatcher={this.props.dispatcher}
          fields={this.getFields()}
          collectionFieldInfo={this.getCollectionFieldInfo()}
          alias={this.getCollectionAlias()}
          crosswalk={this.getCollectionCrosswalk()}
          resources={this.getArchivesSpaceResources()}
          selectedResource={this.state.selectedArchivesSpaceResource}
        />
      </UiView>
    )

  }

  private renderAppError() {
    return (
      <AppError
        errors={this.state.errors}
        onClearError={this.clearError}
        onShowPopup={this.showPopup}
      />
    )
  }

  private clearError = (error: Error) => this.props.dispatcher.clearError(error)

  private showPopup = (popup: Popup) => {
    this.props.dispatcher.showPopup(popup)
  }

  public render() {
    const disabled = this.state.selectedView === ViewType.Export
      || this.state.selectedAlias === ''
    const isOpen =
      this.state.currentFoldout &&
      this.state.currentFoldout.type === FoldoutType.Export

    const currentState: DropdownState = isOpen ? 'open' : 'closed'

    return (
      <div id="app-container">
        <TitleBar>
          <ExportDropdown
            disabled={disabled}
            dropdownState={currentState}
            dropdownStateChanged={this.onExportDropdownChanged}
            onSelectExport={this.onSelectExport}
          />
        </TitleBar>
        {this.renderUpdateBanner()}
        {this.renderApp()}
        {this.renderPopup()}
        {this.renderAppError()}
      </div>
    )
  }

  private onUpdateAvailableDismissed = () =>
    this.props.dispatcher.setUpdateAvailableVisibility(false)

  private onUpdateNow = () =>
    this.props.dispatcher.updateNow()
}
