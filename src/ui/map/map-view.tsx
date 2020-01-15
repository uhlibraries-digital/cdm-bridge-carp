import * as React from 'react';

import { BlankMap } from './blank-map'
import { Map } from './map'
import { Dispatcher } from '../../lib/dispatcher'
import { CdmFieldInfo } from '../../lib/contentdm'
import { IField } from '../../lib/app-state'
import { IResource } from '../../lib/archivesspace';

interface IMapProps {
  readonly dispatcher: Dispatcher
  readonly fields: ReadonlyArray<IField> | null
  readonly collectionFieldInfo: ReadonlyArray<CdmFieldInfo> | null
  readonly alias: string
  readonly crosswalk: any
  readonly resources: ReadonlyArray<IResource>
  readonly selectedResource?: string
}

export class MapView extends React.Component<IMapProps, {}> {

  private renderMap() {
    if (!this.props.collectionFieldInfo) {
      return this.renderMapEmpty()
    }

    return (
      <Map
        dispatcher={this.props.dispatcher}
        className="mapping-container"
        fields={this.props.fields}
        collectionFieldInfo={this.props.collectionFieldInfo}
        alias={this.props.alias}
        crosswalk={this.props.crosswalk}
        resources={this.props.resources}
        selectedResource={this.props.selectedResource}
      />
    )
  }

  private renderMapEmpty() {
    return (
      <BlankMap />
    )
  }

  public render() {
    return (
      <div className="mappings">
        {this.renderMap()}
      </div>
    )
  }
}