import { createContext, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import definitions from './screens.json';
import { buildScreenLayout, type LayoutNode } from './screen-layout';
import { Search, Users, CalendarDays, Inbox, ArrowRight, House, UserRound, ImageIcon } from 'lucide-react';

type Element = {kind:string;x:number;y:number;w:number;h:number;text:string;bold:boolean;size:number;color:string;border:string;classes:string};
type Screen = {name:string;title:string;height:number;elements:Element[]};
const screens: Record<string, Screen> = definitions;
const initial = {Fecha:'',Hora:'',Dirección:'','Barrio / Sector':'','Información complementaria para ubicar el lugar':'','Observaciones adicionales':'','Nueva fecha':'','Nueva hora':'','Motivo del rechazo':''};
const DemoContext = createContext({fields:initial,setFields:(_v:typeof initial)=>{},status:'Sugerida',setStatus:(_s:string)=>{},provider:'María Gómez',setProvider:(_s:string)=>{},service:'Manicure a domicilio',setService:(_s:string)=>{},query:'',setQuery:(_s:string)=>{}});
export function DemoProvider({children}:{children:ReactNode}) {
 const [fields,setFields]=useState(initial),[status,setStatus]=useState('Sugerida'),[provider,setProvider]=useState('María Gómez'),[service,setService]=useState('Manicure a domicilio'),[query,setQuery]=useState('');
 return <DemoContext.Provider value={{fields,setFields,status,setStatus,provider,setProvider,service,setService,query,setQuery}}>{children}</DemoContext.Provider>;
}
export function screenHead(title:string) { const description=`${title}: consulta de proveedores y gestión de servicios a domicilio.`;return {meta:[{title:`${title} · Servicios a domicilio`},{name:'description',content:description},{property:'og:title',content:title},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}; }
export function getScreenTitle(name:string) {return screens[name]?.title ?? 'Pantalla no encontrada';}
const routes:Record<string,Record<string,string>>={
 ExploracinDeProveedores:{'Ver más resultados':'ResultadosDeBsqueda'},
 BsquedaDeServicios:{Buscar:'ResultadosDeBsqueda'},ResultadosDeBsqueda:{'Ver detalle':'PerfilDelProveedor'},
 PerfilDelProveedor:{'Ver catálogo de servicios':'CatlogoDelProveedor'},CatlogoDelProveedor:{'Ver detalle':'DetalleDelServicio'},
 DetalleDelServicio:{'Solicitar este servicio':'SeleccinDelServicio'},SeleccinDelServicio:{Continuar:'FormularioDeSolicitud'},
 FormularioDeSolicitud:{Continuar:'RevisinDeSolicitud'},RevisinDeSolicitud:{'Confirmar y enviar':'SolicitudEnviada',Editar:'FormularioDeSolicitud'},SolicitudEnviada:{'Ver mis solicitudes':'MisSolicitudesYReservas'},
 MisSolicitudesYReservas:{'Ver detalle de una solicitud':'DetalleDeSolicitudreserva'},DetalleDeSolicitudreserva:{'Ver contrapropuesta':'ContrapropuestaDelProveedor','Volver a mis solicitudes':'MisSolicitudesYReservas'},
 SolicitudesRecibidas:{'Ver detalle':'DetalleDeSolicitudRecibida'},DetalleDeSolicitudRecibida:{'Responder solicitud':'ResponderSolicitud'},
 ResponderSolicitud:{Aceptar:'AceptarSolicitud',Rechazar:'RechazarSolicitud','Proponer otro horario':'ProponerNuevoHorario'},
 AceptarSolicitud:{'Confirmar aceptación':'RespuestaEnviada',Cancelar:'ResponderSolicitud'},RechazarSolicitud:{'Confirmar rechazo':'RespuestaEnviada',Cancelar:'ResponderSolicitud'},ProponerNuevoHorario:{'Enviar propuesta':'RespuestaEnviada',Cancelar:'ResponderSolicitud'},
 RespuestaEnviada:{'Volver a solicitudes recibidas':'SolicitudesRecibidas'},ContrapropuestaDelProveedor:{Aceptar:'AceptarContrapropuesta',Rechazar:'RechazarContrapropuesta'},
 AceptarContrapropuesta:{Confirmar:'ResultadoRegistrado',Cancelar:'ContrapropuestaDelProveedor'},RechazarContrapropuesta:{'Confirmar rechazo':'ResultadoRegistrado',Cancelar:'ContrapropuestaDelProveedor'},ResultadoRegistrado:{'Ver mis solicitudes':'MisSolicitudesYReservas'}
};
export function WireframeApp({screen}:{screen:string}) {
 const data=screens[screen];const navigate=useNavigate();const demo=useContext(DemoContext);const [filter,setFilter]=useState('Todas');const [mode,setMode]=useState('Por nombre');
 if(!data)return <main className="wireframe-notfound"><h1>Pantalla no encontrada</h1><Button onClick={()=>navigate({to:'/'})}>Volver al inicio</Button></main>;
 const go=(name:string)=>navigate({to:'/pantallas/$pantalla',params:{pantalla:name}});
 const action=(text:string,e:Element)=>{
  if(['Manicure','Masajes','Peluquería','Otros'].includes(text)){demo.setQuery(text);go('ResultadosDeBsqueda');return;}
  if(['Por nombre','Por categoría'].includes(text)){setMode(text);return;}
  if(['Todas','Pendientes','Sugeridas','Aceptadas','Completadas','Canceladas'].includes(text)){setFilter(text);return;}
  const to=routes[screen]?.[text]; if(!to)return;
  if(text==='Ver detalle'){
   const preceding=data.elements.filter(p=>p.kind==='p'&&p.bold&&p.y<e.y&&p.y>56).at(-1)?.text;
   if(screen==='ResultadosDeBsqueda'&&preceding)demo.setProvider(preceding);
   if(screen==='CatlogoDelProveedor'&&preceding)demo.setService(preceding);
  }
  if(text==='Confirmar y enviar')demo.setStatus('Pendiente');
  if(text==='Confirmar aceptación'||(screen==='AceptarContrapropuesta'&&text==='Confirmar'))demo.setStatus('Aceptada');
  if(text==='Confirmar rechazo')demo.setStatus(screen==='RechazarSolicitud'?'Rechazada':'Cancelada');
  if(text==='Enviar propuesta')demo.setStatus('Sugerida');
  go(to);
 };
 function content(text:string){
  let t=text.replace(/María Gómez/g,demo.provider).replace(/Manicure a domicilio/g,demo.service);
  if(screen==='ResultadosDeBsqueda'&&text.startsWith('Resultados para:'))return `Resultados para: "${demo.query||'manicure a domicilio'}"`;
  if(['RevisinDeSolicitud','DetalleDeSolicitudreserva','DetalleDeSolicitudRecibida','ResponderSolicitud','AceptarSolicitud'].includes(screen)){
   const f=demo.fields;
   if(f.Fecha)t=t.replace('12/09/2026',f.Fecha.split('-').reverse().join('/'));
   if(f.Hora)t=t.replace('3:00 p.m.',f.Hora);
   if(f.Dirección)t=t.replace('Cra 10 # 20-30',f.Dirección);
   if(f['Barrio / Sector'])t=t.replace('El Prado',f['Barrio / Sector']);
   if(f['Observaciones adicionales'])t=t.replace('Observaciones: Ninguna',`Observaciones: ${f['Observaciones adicionales']}`);
  }
  if(['DetalleDeSolicitudreserva','DetalleDeSolicitudRecibida'].includes(screen)&&['Pendiente','Sugerida'].includes(t))return demo.status;
  if(text==='Aceptada / Rechazada / Propuesta enviada'||text==='Aceptada / Cancelada')return demo.status;
  if(demo.fields['Nueva fecha'])t=t.replace('13/09/2026',demo.fields['Nueva fecha'].split('-').reverse().join('/'));
  if(demo.fields['Nueva hora'])t=t.replace('5:00 p.m.',demo.fields['Nueva hora']);
  return t;
 }
 const provider=data.elements.some(e=>e.text==='PROVEEDOR');
 const navigation=[{label:'Explorar proveedores',screen:'ExploracinDeProveedores',icon:Users},{label:'Buscar servicios',screen:'BsquedaDeServicios',icon:Search},{label:'Mis solicitudes y reservas',screen:'MisSolicitudesYReservas',icon:CalendarDays},{label:'Solicitudes recibidas',screen:'SolicitudesRecibidas',icon:Inbox}];
 const active=provider?'SolicitudesRecibidas':['MisSolicitudesYReservas','DetalleDeSolicitudreserva','ContrapropuestaDelProveedor','AceptarContrapropuesta','RechazarContrapropuesta','ResultadoRegistrado'].includes(screen)?'MisSolicitudesYReservas':screen==='BsquedaDeServicios'?'BsquedaDeServicios':'ExploracinDeProveedores';
 const submit=(text:string)=>(screen==='FormularioDeSolicitud'&&text==='Continuar')||(screen==='ProponerNuevoHorario'&&text==='Enviar propuesta')||(screen==='RechazarSolicitud'&&text==='Confirmar rechazo');
 function control(label:Element,e:Element){
  const selected=filter===label.text||mode===label.text;
  return <Button key={label.text} variant={e.color==='333333'||selected?'wireframePrimary':'wireframe'} className="web-action" type={submit(label.text)?'submit':'button'} aria-pressed={['Todas','Pendientes','Sugeridas','Aceptadas','Completadas','Canceladas','Por nombre','Por categoría'].includes(label.text)?selected:undefined} onClick={submit(label.text)?undefined:()=>action(label.text,e)}>{label.text}{routes[screen]?.[label.text]&&<ArrowRight size={16}/>}</Button>;
 }
 function renderNode(node:LayoutNode,index:number){
  const e=node.element;
  if(node.type==='field'&&node.field){
   const field=node.field,search=['Buscar proveedor o servicio','Término de búsqueda'].includes(field),key=field as keyof typeof initial;
   const type=field.includes('fecha')||field==='Fecha'?'date':field.includes('hora')||field==='Hora'?'time':'text';
   const props={id:`field-${index}`,required:!search&&!['Información complementaria para ubicar el lugar','Observaciones adicionales'].includes(field),value:search?demo.query:demo.fields[key]||'',onChange:(ev:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>search?demo.setQuery(ev.target.value):demo.setFields({...demo.fields,[key]:ev.target.value}),className:'web-field'};
   return <div className={`web-field-group ${search||e.h>=60?'web-field-wide':''}`} key={index}><label htmlFor={props.id}>{field}</label>{e.h>=60?<textarea {...props} rows={4}/>:<input {...props} type={type}/>}</div>;
  }
  if(node.type==='control'){const label=node.children.find(p=>p.kind==='p');if(!label)return null;const isAction=routes[screen]?.[label.text]||['Manicure','Masajes','Peluquería','Otros','Por nombre','Por categoría','Todas','Pendientes','Sugeridas','Aceptadas','Completadas','Canceladas'].includes(label.text);return isAction?control(label,e):<span key={index} className="web-status">{content(label.text)}</span>;}
  if(node.type==='card'){
   const state=node.children.find(p=>['Pendiente','Sugerida','Completada','Aceptada'].includes(p.text));
   if(screen==='MisSolicitudesYReservas'&&filter!=='Todas'&&state&&filter!==`${state.text}s`)return null;
   const texts=node.children.filter(p=>p.kind==='p'&&p.text!=='Ver detalle');
   const clickable=['ExploracinDeProveedores','MisSolicitudesYReservas'].includes(screen);
   const open=()=>{if(screen==='ExploracinDeProveedores'){demo.setProvider(texts[0]?.text||demo.provider);go('PerfilDelProveedor');}else go('DetalleDeSolicitudreserva');};
   return <article key={index} className="web-item">{screen==='ExploracinDeProveedores'&&<div className="web-avatar"><UserRound size={24}/></div>}<div className="web-item-content">{texts.map((p,i)=>i===0?<h2 key={i}>{content(p.text)}</h2>:<p key={i} className={p===state?'web-status':'web-detail'}>{content(p.text)}</p>)}</div>{node.action?control(node.children.find(p=>p.text==='Ver detalle')||e,node.action):clickable?<Button variant="wireframe" className="web-action" onClick={open}>Ver detalle<ArrowRight size={16}/></Button>:null}</article>;
  }
  if(node.type==='media')return <div key={index} className="web-media"><ImageIcon size={40}/>{node.children.filter(p=>p.kind==='p').map((p,i)=><span key={i}>{content(p.text)}</span>)}</div>;
  if(node.type==='status')return null;
  return e.bold?<h2 key={index} className="web-section-title">{content(e.text)}</h2>:<p key={index} className="web-copy">{content(e.text)}</p>;
 }
 const rows=buildScreenLayout(data.elements);
 return <div className="prototype-layout"><aside className="prototype-nav"><div className="web-brand"><House size={25}/><strong>Servicios<br/>a domicilio</strong></div><nav aria-label="Navegación principal">{navigation.map(item=><Button key={item.screen} variant={active===item.screen?'wireframePrimary':'wireframe'} aria-current={active===item.screen?'page':undefined} onClick={()=>go(item.screen)}><item.icon size={18}/>{item.label}</Button>)}</nav><div className="web-role"><UserRound size={18}/>{provider?'Proveedor':'Cliente'}</div></aside>
 <div className="web-workspace"><header className="web-page-header"><div><span className="web-eyebrow">Servicios a domicilio</span><h1>{data.title}</h1></div><span className="web-role-badge">{provider?'PROVEEDOR':'CLIENTE'}</span></header>
 <main className="wireframe-screen" aria-label={data.title}><form onSubmit={ev=>{ev.preventDefault();const target=screen==='FormularioDeSolicitud'?'RevisinDeSolicitud':screen==='ProponerNuevoHorario'?'RespuestaEnviada':screen==='RechazarSolicitud'?'RespuestaEnviada':'ResultadosDeBsqueda';if(screen==='ProponerNuevoHorario')demo.setStatus('Sugerida');if(screen==='RechazarSolicitud')demo.setStatus('Rechazada');go(target);}}>
 {rows.map((row,i)=><div key={i} className={`web-row web-row-${row[0]?.type} ${row.length>1?'web-row-multiple':''}`}>{row.map((node,j)=>renderNode(node,i*100+j))}</div>)}
 </form></main><footer className="prototype-footer"><span>Servicios a domicilio</span><Button variant="wireframe" onClick={()=>navigate({to:'/'})}><House size={15}/>Volver al inicio</Button></footer></div></div>;
}
