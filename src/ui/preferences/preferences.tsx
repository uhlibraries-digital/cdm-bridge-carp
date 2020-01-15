import * as React from 'react'

import { Dispatcher } from '../../lib/dispatcher'
import { PreferencesTab } from '../../lib/preferences'
import { Dialog, DialogFooter } from '../dialog'
import { TabBar } from '../tab-bar'
import { ContentDm } from './contentdm'
import { Map } from './map'
import { ArchivesSpace } from './archivesspace'
import { Button, ButtonGroup } from '../button'
import { Fields } from './fields'
import { IField } from '../../lib/app-state'
import { sanitizeId } from '../../lib/id-pool'
import { TokenStore } from '../../lib/stores/token-store'

interface IPreferencesProps {
  readonly dispatcher: Dispatcher
  readonly preferences: any
  readonly defaultFields: ReadonlyArray<IField>
  readonly onDismissed: () => void
}

interface IPreferencesState {
  readonly selectedIndex: PreferencesTab
  readonly contentDmHostname: string
  readonly contentDmPort: string
  readonly contentDmSsl: boolean
  readonly exportFields: ReadonlyArray<IField>
  readonly defaultFields: ReadonlyArray<IField>
  readonly url: string
  readonly aspaceEndpoint: string
  readonly aspaceUsername: string
  readonly aspacePassword: string
}

export class Preferences extends React.Component<
  IPreferencesProps,
  IPreferencesState
  > {
  public constructor(props: IPreferencesProps) {
    super(props)

    const cdmPort = this.props.preferences.cdm.port ?
      this.props.preferences.cdm.port.toString() :
      ''

    this.state = {
      selectedIndex: PreferencesTab.ContentDM,
      contentDmHostname: this.props.preferences.cdm.hostname,
      contentDmPort: cdmPort,
      contentDmSsl: this.props.preferences.cdm.ssl,
      url: this.props.preferences.mapUrl,
      aspaceEndpoint: this.props.preferences.aspace.apiEndpoint,
      aspaceUsername: this.props.preferences.aspace.username,
      aspacePassword: '',
      exportFields: Array.from(this.props.preferences.fields),
      defaultFields: Array.from(this.props.defaultFields)
    }

    this.getArchivesSpacePassword(this.props.preferences.aspace.username)
  }

  private onSave = async () => {
    this.props.dispatcher.setPreferencesArchivesSpace(
      this.state.aspaceEndpoint,
      this.state.aspaceUsername,
      this.state.aspacePassword
    )

    this.props.dispatcher.setPreferencesContentDm(
      this.state.contentDmHostname,
      this.state.contentDmPort,
      this.state.contentDmSsl
    )

    this.props.dispatcher.setPreferencesMapUrl(this.state.url)

    this.props.onDismissed()
  }

  private onHostnameChanged = (hostname: string) => {
    this.setState({ contentDmHostname: hostname })
  }

  private onPortChanged = (port: string) => {
    this.setState({ contentDmPort: port })
  }

  private onSslChanged = (ssl: boolean) => {
    this.setState({ contentDmSsl: ssl })
  }

  private onUrlChanged = (url: string) => {
    this.setState({ url: url })
  }

  private onFieldValueChanged = (index: number, value: string) => {
    let newExportFields = Array.from(this.state.exportFields)
    const newField: IField = { ...newExportFields[index] }

    newField.id = sanitizeId(value)
    newField.name = value
    newExportFields[index] = newField

    this.setState({ exportFields: newExportFields })
  }

  private onFieldRequiredChanged = (index: number, value: boolean) => {
    let newExportFields = Array.from(this.state.exportFields)
    const newField: IField = { ...newExportFields[index] }

    newField.required = value
    newExportFields[index] = newField

    this.setState({ exportFields: newExportFields })
  }

  private onFieldInsert = (index: number) => {
    let newExportFields = Array.from(this.state.exportFields)
    newExportFields.splice(index + 1, 0, {
      id: '',
      name: '',
      required: false
    })
    this.setState({
      exportFields: newExportFields
    })
  }

  private onFieldRemove = (index: number) => {
    let newExportFields = Array.from(this.state.exportFields)
    newExportFields.splice(index, 1)
    this.setState({
      exportFields: newExportFields
    })
  }

  private onReset = () => {
    const newFields = Array.from(this.state.defaultFields)
    this.setState({ exportFields: newFields })
  }

  public render() {
    return (
      <Dialog
        id="preferences"
        title="Preferences"
        onDismissed={this.props.onDismissed}
        onSubmit={this.onSave}
      >
        <TabBar
          onTabClicked={this.onTabClicked}
          selectedIndex={this.state.selectedIndex}
        >
          <span>CONTENTdm</span>
          <span>BCDAMS Map</span>
          <span>ArchivesSpace</span>
        </TabBar>
        {this.renderActiveTab()}
        <DialogFooter>
          {this.renderActiveButtons()}
        </DialogFooter>
      </Dialog>
    )
  }

  private renderActiveButtons() {
    const index = this.state.selectedIndex
    switch (index) {
      case PreferencesTab.ContentDM:
        return (
          <ButtonGroup>
            <Button type="submit">Save</Button>
            <Button onClick={this.props.onDismissed}>Cancel</Button>
          </ButtonGroup>
        )
      case PreferencesTab.Map:
        return (
          <ButtonGroup>
            <Button type="submit">Save</Button>
            <Button onClick={this.props.onDismissed}>Cancel</Button>
          </ButtonGroup>
        )
      case PreferencesTab.ArchivesSpace:
        return (
          <ButtonGroup>
            <Button type="submit">Save</Button>
            <Button onClick={this.props.onDismissed}>Cancel</Button>
          </ButtonGroup>
        )
      case PreferencesTab.Fields:
        return (
          <ButtonGroup>
            <Button
              className="reset"
              onClick={this.onReset}
            >
              Reset
            </Button>
            <Button onClick={this.props.onDismissed}>Cancel</Button>
            <Button type="submit">Save</Button>
          </ButtonGroup>
        )
    }
  }

  private renderActiveTab() {
    const index = this.state.selectedIndex
    switch (index) {
      case PreferencesTab.ContentDM:
        return (
          <ContentDm
            hostname={this.state.contentDmHostname}
            port={this.state.contentDmPort}
            ssl={this.state.contentDmSsl}

            onHostnameChanged={this.onHostnameChanged}
            onPortChanged={this.onPortChanged}
            onSslChanged={this.onSslChanged}
          />
        )
      case PreferencesTab.Map:
        return (
          <Map
            url={this.state.url}
            onUrlChanged={this.onUrlChanged}
          />
        )
      case PreferencesTab.ArchivesSpace:
        return (
          <ArchivesSpace
            endpoint={this.state.aspaceEndpoint}
            username={this.state.aspaceUsername}
            password={this.state.aspacePassword}

            onEndpointChanged={this.onASpaceEndpointChanged}
            onUsernameChanged={this.onUsernameChanged}
            onPasswordChanged={this.onPasswordChanged}
          />
        )
      case PreferencesTab.Fields:
        return (
          <Fields
            fields={this.state.exportFields}
            onFieldValueChanged={this.onFieldValueChanged}
            onFieldRequiredChanged={this.onFieldRequiredChanged}
            onFieldInsert={this.onFieldInsert}
            onFieldRemove={this.onFieldRemove}
          />
        )
    }
  }

  private onTabClicked = (index: number) => {
    this.setState({ selectedIndex: index })
  }

  private onASpaceEndpointChanged = (endpoint: string) => {
    this.setState({ aspaceEndpoint: endpoint })
  }

  private onUsernameChanged = (username: string) => {
    this.setState({ aspaceUsername: username })
  }

  private onPasswordChanged = (password: string) => {
    this.setState({ aspacePassword: password })
  }

  private async getArchivesSpacePassword(username: string): Promise<any> {
    try {
      const password = await TokenStore.getItem('cdmbridge2carp/archivesspace', username) || ''
      this.setState({ aspacePassword: String(password) })
    }
    catch (e) { }
  }
}