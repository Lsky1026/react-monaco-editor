import React from 'react'
// eslint-disable-next-line import/no-unresolved
import * as MonacoEditor from 'monaco-editor'
import { debounce } from 'lodash'
import { isFunc } from '../utils'

import MonacoContainer from './monaco-container'
import monacoEditorInit, { Config } from './init'

import { themes } from '../config/themes'

interface EditorOptions {
  width?: number | 0,
  height?: number | 0,
  [propName: string]: any
}
export interface DiffProps {
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  original: string;
  modified: string;
  originalLanguage?: string;
  modifiedLanguage?: string;
  language: string;
  theme?: string;
  options?: MonacoEditor.editor.IDiffEditorOptions;
  monacoWillMount?: (monaco: any) => void;
  editorDidMount?: (original: MonacoEditor.editor.ITextModel, modified: MonacoEditor.editor.ITextModel, editor: MonacoEditor.editor.IStandaloneDiffEditor) => void;
  onChange?: (value: string) => void;
  /**
   * custom cdn
   */
  cdnConfig?: Config;
}

interface EditorState {
  ready: boolean,
  monacoDidMount: boolean
}

class Index extends React.Component<DiffProps, EditorState> {
  public monaco: any;

  public editor: any;

  public container: HTMLDivElement | null

  static displayName = 'MonacoDiffEditor'

  constructor(props: DiffProps) {
    super(props)

    this.state = {
      ready: false,
      monacoDidMount: false,
    }

    this.monaco = null
    this.editor = null

    this.container = null

    this.bindRef = this.bindRef.bind(this)
    this.createEditor = this.createEditor.bind(this)
  }

  componentDidMount() {
    const that = this
    const { monacoWillMount = () => { }, cdnConfig } = this.props
    monacoEditorInit.init(cdnConfig)
      .then((m) => {
        if (isFunc(monacoWillMount)) monacoWillMount(m)
        that.monaco = m
        that.setState({ monacoDidMount: true })
      })
  }

  componentDidUpdate(prevProps: DiffProps) {
    const { ready, monacoDidMount } = this.state

    if (!monacoDidMount) return

    if (!ready) this.createEditor()

    const {
      original, originalLanguage, modified, modifiedLanguage, language,
      theme, options, height, width,
    } = this.props

    if (prevProps.width !== width || prevProps.height !== height) {
      this.editor.layout({ width, height })
    }

    // original
    if (prevProps.original !== original) {
      this.editor.getModel().original.setValue(original)
    }

    // modified
    if (prevProps.modified !== modified) {
      this.editor.getModel().modified.setValue(modified)
    }

    // originalLanguage、modifiedLanguage、language
    if (prevProps.originalLanguage !== originalLanguage
      || prevProps.modifiedLanguage !== modifiedLanguage
      || prevProps.language !== language) {
      const { original: or, modified: mo } = this.editor.getModel()

      this.monaco.editor.setModelLanguage(or, originalLanguage || language)
      this.monaco.editor.setModelLanguage(mo, modifiedLanguage || language)
    }

    // theme
    if (prevProps.theme !== theme) {
      this.monaco.editor.setTheme(theme)
    }

    // options
    if (prevProps.options !== options) {
      this.editor.updateOptions(options)
    }
  }

  componentWillUnmount() {
    if (this.editor) {
      this.editor.dispose()
    }
  }

  setModels() {
    const {
      original, modified, originalLanguage, modifiedLanguage, language,
    } = this.props

    const originalModel = this.monaco.editor
      .createModel(original, originalLanguage || language)

    const modifiedModel = this.monaco.editor
      .createModel(modified, modifiedLanguage || language)

    this.editor.setModel({ original: originalModel, modified: modifiedModel })
  }

  bindRef(node: HTMLDivElement | null) {
    this.container = node
  }

  createEditor() {
    const {
      editorDidMount = () => { }, theme, options, width, height, onChange,
    } = this.props
    if (!this.monaco || !this.container) return

    this.editor = this.monaco.editor.createDiffEditor(this.container, {
      ...options,
      automaticLayout: true,
    })

    this.setModels()

    const { original, modified } = this.editor.getModel()

    if (isFunc(editorDidMount)) {
      editorDidMount(
        original,
        modified,
        this.editor,
      )
    }

    if (onChange && isFunc(onChange)) {
      modified.onDidChangeContent(debounce(() => {
        onChange(modified.getValue())
      }, 32))
    }

    Object.keys(themes).forEach((v) => {
      this.monaco.editor.defineTheme(v, themes[v])
    })

    this.monaco.editor.setTheme(theme)

    this.editor.layout({ width, height })

    this.setState({ ready: true })
  }

  render() {
    const { ready } = this.state
    const { width, height, style } = this.props
    return (
      <MonacoContainer
        width={width}
        height={height}
        style={style}
        ready={ready}
        bordered={false}
        bindRef={this.bindRef}
      />
    )
  }
}

export default Index
