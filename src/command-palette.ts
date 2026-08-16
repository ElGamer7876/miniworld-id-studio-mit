export type StudioCommand={id:string;label:string;group:string;keywords?:string;shortcut?:string;disabled?:boolean};

const normalize=(value:string):string=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();

export function filterStudioCommands(commands:StudioCommand[],query:string,limit=30):StudioCommand[]{
  const needle=normalize(query);
  return commands.map((command,index)=>{const label=normalize(command.label),haystack=normalize(`${command.label} ${command.group} ${command.keywords||''}`),position=needle?haystack.indexOf(needle):0;const score=!needle?100-index:label===needle?400:label.startsWith(needle)?300:position===0?220:position>=0?150-position:-1;return{command,score,index}}).filter(item=>item.score>=0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,Math.max(1,limit)).map(item=>item.command);
}
