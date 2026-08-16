export type PanelLayout={projectPanelVisible:boolean;inspectorVisible:boolean};
export type PanelTarget='project'|'inspector'|'focus';

export function normalizePanelLayout(input?:Partial<PanelLayout>):PanelLayout{return{projectPanelVisible:input?.projectPanelVisible!==false,inspectorVisible:input?.inspectorVisible!==false}}

export function togglePanelLayout(layout:PanelLayout,target:PanelTarget):PanelLayout{
  const current=normalizePanelLayout(layout);
  if(target==='project')return{...current,projectPanelVisible:!current.projectPanelVisible};
  if(target==='inspector')return{...current,inspectorVisible:!current.inspectorVisible};
  const showBoth=!current.projectPanelVisible&&!current.inspectorVisible;
  return{projectPanelVisible:showBoth,inspectorVisible:showBoth};
}
