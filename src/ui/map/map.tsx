import * as React from 'react'

import { CdmFieldInfo } from '../../lib/contentdm'
import { MapSelect } from './map-select'
import { Row } from '../layout'
import { Dispatcher } from '../../lib/dispatcher'
import { IField, ICrosswalkFieldHash, ICrosswalkField } from '../../lib/app-state'
import { ArchivesSpaceResource } from './archives-space-resource'
import { Location } from './location'
import { IResource } from '../../lib/archivesspace';
import { Checkbox, CheckboxValue } from '../form'

interface IMapProps {
  readonly dispatcher: Dispatcher
  readonly className?: string
  readonly fields: ReadonlyArray<IField> | null
  readonly collectionFieldInfo: ReadonlyArray<CdmFieldInfo> | null
  readonly alias: string
  readonly crosswalk: any
  readonly resources: ReadonlyArray<IResource>
  readonly selectedResource?: string
}

interface IMapState {
  readonly disabledNicks: ReadonlyArray<string>
  readonly accessPath: string
  readonly preservationPath: string
  readonly modifiedMasterPath: string
  readonly renameFiles: boolean
}

export class Map extends React.Component<IMapProps, IMapState> {

  public constructor(props: IMapProps) {
    super(props)

    this.state = {
      disabledNicks: [],
      accessPath: '',
      preservationPath: '',
      modifiedMasterPath: '',
      renameFiles: true
    }
  }

  public componentWillMount() {
    this.loadDisabledNicks(this.props.alias)
  }

  public componentWillReceiveProps(nextProps: IMapProps) {
    this.loadDisabledNicks(nextProps.alias)
    if (nextProps.alias !== this.props.alias) {
      this.setState({
        accessPath: '',
        preservationPath: '',
        modifiedMasterPath: '',
        renameFiles: true
      })
    }
  }

  private loadDisabledNicks(alias: string) {
    const crosswalk = this.getCrosswalk(alias)
    const usedNicksArray = Object.keys(crosswalk)
      .map(id => crosswalk[id].nicks || [])
      .map(nicks => nicks.filter((nick: string) => nick !== ""))

    const usedNicks = usedNicksArray.filter(e => e.length > 0)
      .reduce((acc, val) => acc.concat(val), [])

    this.setState({ disabledNicks: usedNicks })
  }

  private onSelectedFieldChanged = (
    field: IField,
    nick: string,
    prev: string,
    nicks: ReadonlyArray<string>
  ) => {
    this.disableNick(nick, prev)
    this.props.dispatcher.setCrosswalk(this.props.alias, field, nicks)
  }

  private disableNick(nick: string, prev: string) {
    const fields = Array.from(this.state.disabledNicks)
    const index = fields.indexOf(prev)
    fields.splice(index, 1)
    fields.push(nick)

    this.setState({ disabledNicks: fields })
  }

  private getCrosswalk(alias: string, field?: IField): ICrosswalkFieldHash {
    const crosswalk = this.props.crosswalk || {}
    if (!this.props.fields) {
      return {}
    }

    if (!crosswalk[alias]) {
      let cw: ICrosswalkFieldHash = {}
      this.props.fields.map(f => {
        return cw[f.id] = this.getCrosswalkDefaultField()
      })
      return cw
    }
    if (field && !crosswalk[alias][field.id]) {
      crosswalk[alias][field.id] = this.getCrosswalkDefaultField()
    }

    return crosswalk[alias]
  }

  private getCrosswalkDefaultField(): ICrosswalkField {
    return {
      nicks: [""],
      itemExport: false
    }
  }

  private onAccessPathChanged = (path: string) => {
    this.setState({ accessPath: path })
    this.props.dispatcher.setAccessPath(path)
  }

  private onPreservationPathChanged = (path: string) => {
    this.setState({ preservationPath: path })
    this.props.dispatcher.setPreservationPath(path)
  }

  private onModifiedMasterPathChanged = (path: string) => {
    this.setState({ modifiedMasterPath: path })
    this.props.dispatcher.setModifiedMasterPath(path)
  }

  private onResourceChanged = (uri: string) => {
    this.props.dispatcher.setArchivesSpaceResource(uri)
  }

  private onMapFieldAddition = (field: IField | undefined) => {
    if (!field) {
      return
    }

    const crosswalk = this.getCrosswalk(this.props.alias, field)
    const value = crosswalk[field.id].nicks.concat([""])
    this.props.dispatcher.setCrosswalk(this.props.alias, field, value)
  }

  private onMapFieldSubtract = (field: IField | undefined, index: number) => {
    if (!field) {
      return
    }

    const crosswalk: ICrosswalkFieldHash = this.getCrosswalk(this.props.alias, field)
    const value = Array.from(crosswalk[field.id].nicks) as Array<string>
    value.splice(index, 1)
    this.props.dispatcher.setCrosswalk(this.props.alias, field, value)
  }

  private onMapItemExportChanged = (field: IField | undefined) => {
    if (!field) {
      return
    }

    const crosswalk: ICrosswalkFieldHash = this.getCrosswalk(this.props.alias, field)
    const value = !crosswalk[field.id].itemExport
    this.props.dispatcher.setCrosswalkItemExport(this.props.alias, field, value)
  }

  private renderMapItem() {
    const fields = this.props.fields
    const crosswalk = this.getCrosswalk(this.props.alias)
    if (!fields) {
      return
    }

    const mapitems = fields.map((field, index) => {
      const value = crosswalk[field.id] ?
        crosswalk[field.id].nicks || [""] : [""]
      const itemExport = crosswalk[field.id] ?
        crosswalk[field.id].itemExport : false

      return (
        <Row key={index}>
          <MapItem
            key={index}
            field={field}
            disabledNicks={this.state.disabledNicks}
            itemExport={itemExport}
            collectionFieldInfo={this.props.collectionFieldInfo}
            onSelectedFieldChanged={this.onSelectedFieldChanged}
            onMapFieldAddition={this.onMapFieldAddition}
            onMapFieldSubtract={this.onMapFieldSubtract}
            onMapItemExportChanged={this.onMapItemExportChanged}
            value={value}
          />
        </Row>
      )
    })

    return (
      <div className="mapping-fields">
        {mapitems}
      </div>
    )
  }

  private renderMapHeader() {
    return (
      <Row className="header">
        <div className="target">MAP Field</div>
        <div className="source">CDM Field</div>
      </Row>
    )
  }

  private renderArchivesSpaceResouces() {
    return (
      <Row className="archives-space">
        <ArchivesSpaceResource
          label="ArchivesSpace Collection"
          resources={this.props.resources}
          selectedResource={this.props.selectedResource}
          onResouceChanged={this.onResourceChanged}
        />
      </Row>
    )
  }

  private renderAccessPath() {
    return (
      <Location
        label="Access Files Local Path"
        path={this.state.accessPath}
        onChange={this.onAccessPathChanged}
      />
    )
  }

  private renderPreservationPath() {
    return (
      <Location
        label="Preservation Files Local Path"
        path={this.state.preservationPath}
        onChange={this.onPreservationPathChanged}
      />
    )
  }

  private renderModifiedMasterPath() {
    return (
      <Location
        label="Modified Masters Local Path"
        path={this.state.modifiedMasterPath}
        onChange={this.onModifiedMasterPathChanged}
      />
    )
  }

  private renderRenameFilesOption() {
    const check = this.state.renameFiles ? CheckboxValue.On : CheckboxValue.Off
    return (
      <Row>
        <Checkbox
          label="Rename files during export"
          value={check}
          onChange={this.onRenameFilesChange}
        />
      </Row>
    )
  }

  private onRenameFilesChange = (event: React.FormEvent<HTMLInputElement>) => {
    const checked = event.currentTarget.checked
    this.props.dispatcher.setRenameFiles(checked)
    this.setState({ renameFiles: checked })
  }

  public render() {
    return (
      <div className={this.props.className}>
        {this.renderArchivesSpaceResouces()}
        {this.renderRenameFilesOption()}
        {this.renderAccessPath()}
        {this.renderPreservationPath()}
        {this.renderModifiedMasterPath()}
        {this.renderMapHeader()}
        {this.renderMapItem()}
      </div>
    )
  }

}

interface IMapItemProps {
  readonly field: IField
  readonly collectionFieldInfo: ReadonlyArray<CdmFieldInfo> | null
  readonly value: ReadonlyArray<string>
  readonly disabledNicks?: ReadonlyArray<string>
  readonly itemExport?: boolean
  readonly onMapFieldAddition: (field: IField | undefined) => void
  readonly onMapFieldSubtract: (field: IField | undefined, index: number) => void
  readonly onSelectedFieldChanged: (
    field: IField,
    value: string,
    prev: string,
    nicks: ReadonlyArray<string>
  ) => void
  readonly onMapItemExportChanged: (field: IField | undefined) => void
}

interface IMapItemState {
  readonly value: ReadonlyArray<string>
  readonly field: IField
}

class MapItem extends React.Component<IMapItemProps, IMapItemState> {

  public constructor(props: IMapItemProps) {
    super(props)

    this.state = {
      field: this.props.field,
      value: this.props.value || [""]
    }
  }

  public async componentWillReceiveProps(nextProps: IMapItemProps) {
    this.setState({ value: nextProps.value })
  }

  private onSelectedChanged = (
    nick: string,
    index: number
  ) => {
    const prev = this.state.value[index] || ""
    let nicks = Array.from(this.state.value)
    nicks[index] = nick

    this.setState({ value: nicks })
    this.props.onSelectedFieldChanged(this.state.field, nick, prev, nicks)
  }

  public render() {
    const options = this.props.collectionFieldInfo
    if (!options) {
      return
    }

    const labelClass = this.props.field.required ?
      'required' : ''
    const disNicks = this.props.disabledNicks || []

    return (
      <MapSelect
        field={this.props.field}
        label={this.props.field.name}
        labelClassName={labelClass}
        values={this.state.value}
        itemExport={this.props.itemExport}
        onChange={this.onSelectedChanged}
        onMapFieldAddition={this.props.onMapFieldAddition}
        onMapFieldSubtract={this.props.onMapFieldSubtract}
        onMapItemExportChange={this.props.onMapItemExportChanged}
      >
        <option key="o-none" value="">
          -- Select a field --
        </option>
        {options.map(f => (
          <option
            key={f.nick}
            value={f.nick}
            disabled={disNicks.indexOf(f.nick) !== -1}
          >
            {f.name}
          </option>
        ))}
      </MapSelect>
    )
  }

}