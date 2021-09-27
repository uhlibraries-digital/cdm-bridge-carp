import * as React from 'react'

import { DialogContent } from '../dialog'
import { Row } from '../layout'
import { TextBox } from '../form'

interface IVocabularyProps {
  readonly vocabularyUrl: string

  readonly onVocabularyUrlChange: (url: string) => void
}


export class Vocabulary extends React.Component<IVocabularyProps, {}> {
  public render() {
    return (
      <DialogContent>
        <Row>
          <TextBox
            label="Vocabulary URL"
            value={this.props.vocabularyUrl}
            onValueChanged={this.props.onVocabularyUrlChange}
            autoFocus={true}
          />
        </Row>
      </DialogContent>
    )
  }
}