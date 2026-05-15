; installer.nsh — included via electron-builder's nsis.include
; 使用 NSIS 预定义寄存器 $R9 存储文件关联选择，避免 Var 声明警告

;======================================================================
; customInit: 安装初始化阶段（第一个页面出现之前）询问文件关联
!macro customInit
  StrCpy $R9 "0"
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Do you want to associate Markdown files (.md, .markdown, .mmd, .mdown, .mdtext, .mdx) with MarkText?" \
    /SD IDNO IDNO SkipAssocInit
  StrCpy $R9 "1"
  SkipAssocInit:
!macroend

;======================================================================
; customInstall: 文件复制完成后，根据用户选择写注册表
!macro customInstall
  ${If} $R9 == "1"
    WriteRegStr HKCU "Software\Classes\.md"       "" "MarkText.Document"
    WriteRegStr HKCU "Software\Classes\.markdown" "" "MarkText.Document"
    WriteRegStr HKCU "Software\Classes\.mmd"      "" "MarkText.Document"
    WriteRegStr HKCU "Software\Classes\.mdown"    "" "MarkText.Document"
    WriteRegStr HKCU "Software\Classes\.mdtxt"    "" "MarkText.Document"
    WriteRegStr HKCU "Software\Classes\.mdtext"   "" "MarkText.Document"
    WriteRegStr HKCU "Software\Classes\.mdx"      "" "MarkText.Document"

    WriteRegStr HKCU "Software\Classes\MarkText.Document" \
      "" "MarkText Markdown Document"
    WriteRegExpandStr HKCU "Software\Classes\MarkText.Document\DefaultIcon" \
      "" "$INSTDIR\resources\icons\md.ico,0"
    WriteRegExpandStr HKCU "Software\Classes\MarkText.Document\shell\open\command" \
      "" '"$INSTDIR\marktext.exe" "%1"'
  ${EndIf}
!macroend

;======================================================================
; customUnInstall: 卸载时清理注册表
!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\MarkText.Document\shell\open\command"
  DeleteRegKey HKCU "Software\Classes\MarkText.Document\shell\open"
  DeleteRegKey HKCU "Software\Classes\MarkText.Document\shell"
  DeleteRegKey HKCU "Software\Classes\MarkText.Document\DefaultIcon"
  DeleteRegKey HKCU "Software\Classes\MarkText.Document"
  DeleteRegKey HKCU "Software\Classes\.md"
  DeleteRegKey HKCU "Software\Classes\.markdown"
  DeleteRegKey HKCU "Software\Classes\.mmd"
  DeleteRegKey HKCU "Software\Classes\.mdown"
  DeleteRegKey HKCU "Software\Classes\.mdtxt"
  DeleteRegKey HKCU "Software\Classes\.mdtext"
  DeleteRegKey HKCU "Software\Classes\.mdx"

  MessageBox MB_YESNO "Do you want to delete user settings?" /SD IDNO IDNO SkipRemoval
    SetShellVarContext current
    RMDir /r "$APPDATA\marktext"
  SkipRemoval:
!macroend