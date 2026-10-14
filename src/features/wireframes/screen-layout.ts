export type WireframeElement = {kind:string;x:number;y:number;w:number;h:number;text:string;bold:boolean;size:number;color:string;border:string;classes:string};
export type LayoutNode = {element:WireframeElement;children:WireframeElement[];field?:string;action?:WireframeElement;type:'text'|'field'|'control'|'card'|'media'|'status'};

// Interpret the shared wireframe geometry as semantic groups, without duplicating its content.
export function buildScreenLayout(elements:WireframeElement[]):LayoutNode[][] {
 const body=elements.filter(e=>e.y>=56);
 const used=new Set<WireframeElement>();
 const nodes:LayoutNode[]=[];
 const inside=(p:WireframeElement,r:WireframeElement)=>p!==r&&p.y>=r.y&&p.y<r.y+r.h&&p.x>=r.x&&p.x<r.x+r.w;
 for(const e of body){
  if(used.has(e))continue;
  if(e.kind==='p'){nodes.push({element:e,children:[],type:'text'});continue;}
  const children=body.filter(p=>inside(p,e));
  children.forEach(p=>used.add(p));
  const label=body.filter(p=>p.kind==='p'&&p.y<e.y&&p.x===e.x).at(-1);
  const field=e.border==='999999'&&e.h>=32&&e.color==='white';
  if(field&&label){const i=nodes.findIndex(n=>n.element===label);if(i>=0)nodes.splice(i,1);nodes.push({element:e,children,field:label.text,type:'field'});continue;}
  const type=e.h>=54?(e.color==='gray50'?'card':'media'):e.h<=40&&children.some(p=>p.kind==='p')?'control':'status';
  nodes.push({element:e,children,type});
 }
 // A repeated item's following action belongs to that item on the web layout.
 for(let i=0;i<nodes.length-1;i++){
  const n=nodes[i],next=nodes[i+1];
  if(n?.type==='card'&&next?.type==='control'&&next.children.some(p=>p.text==='Ver detalle')){n.action=next.element;n.children.push(...next.children);nodes.splice(i+1,1);}
 }
 const rows:LayoutNode[][]=[];
 for(const node of nodes){
  const previous=rows.at(-1);
  const first=previous?.[0];
  if(previous&&first&&((node.type==='card'&&first.type==='card')||(node.type==='control'&&first.type==='control')||(node.type==='field'&&first.type==='field'))){previous.push(node);}else rows.push([node]);
 }
 return rows;
}