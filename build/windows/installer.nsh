; installer.nsh — included via electron-builder's nsis.include
;
; 文件关联询问在安装初始化阶段（界面出现前）完成，
; 避免在文件复制中途打断用户。

;======================================================================
; customHeader: 声明全局变量
!macro customHeader
  Var AssociateMd
!macroend

;======================================================================
; customInit: 安装初始化阶段（第一个页面出现之前）询问
!macro customInit
  StrCpy $AssociateMd "0"
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Do you want to associate Markdown files (.md, .markdown, .mmd, .mdown, .mdtext, .mdx) with MarkText?" \
    /SD IDNO IDYES AssocYes IDNO AssocNo
  AssocYes:
    StrCpy $AssociateMd "1"
    Goto AssocDone
  AssocNo:
    StrCpy $AssociateMd "0"
  AssocDone:
!macroend

;======================================================================
; customInstall: 文件复制完成后，根据用户选择写注册表
!macro customInstall
  ${If} $AssociateMd == "1"
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