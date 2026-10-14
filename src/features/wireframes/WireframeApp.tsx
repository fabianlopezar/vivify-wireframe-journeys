import { createContext, useContext, useState, type ReactNode, type CSSProperties } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import definitions from './screens.json';

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
function geometry(e:Element):CSSProperties {return {left:`${e.x/4.2}%`,top:e.y,width:e.w?`${e.w/4.2}%`:undefined,height:e.h||undefined,'--text-size':`${e.size}px`} as CSSProperties;}
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
 function fieldFor(e:Element){
  if(e.kind!=='div'||e.border!=='999999'||e.h<32)return null;
  return data?.elements.filter(p=>p.kind==='p'&&p.y<e.y&&p.x===e.x).at(-1)?.text ?? null;
 }
 const provider=data.elements.some(e=>e.text==='PROVEEDOR');
 const elements=data.elements;
 return <div className="prototype-layout"><aside className="prototype-nav"><strong>Servicios a domicilio</strong><nav aria-label="Navegación principal"><Button variant="wireframe" onClick={()=>navigate({to:'/'})}>Explorar proveedores</Button><Button variant="wireframe" onClick={()=>go('BsquedaDeServicios')}>Buscar servicios</Button><Button variant="wireframe" onClick={()=>go('MisSolicitudesYReservas')}>Mis solicitudes y reservas</Button><Button variant="wireframe" onClick={()=>go('SolicitudesRecibidas')}>Solicitudes recibidas</Button></nav></aside>
 <main className="wireframe-screen" style={{minHeight:data.height}} aria-label={data.title}>
 <form onSubmit={ev=>{ev.preventDefault();const target=screen==='FormularioDeSolicitud'?'RevisinDeSolicitud':screen==='ProponerNuevoHorario'?'RespuestaEnviada':screen==='RechazarSolicitud'?'RespuestaEnviada':'ResultadosDeBsqueda';if(screen==='ProponerNuevoHorario')demo.setStatus('Sugerida');if(screen==='RechazarSolicitud')demo.setStatus('Rechazada');go(target);}}>
 {elements.map((e,index)=>{
  const style=geometry(e); const field=fieldFor(e);
  if(field){const search=['Buscar proveedor o servicio','Término de búsqueda'].includes(field);const key=field as keyof typeof initial; const type=field.includes('fecha')||field==='Fecha'?'date':field.includes('hora')||field==='Hora'?'time':'text'; const props={id:`field-${index}`,'aria-label':field,required:!search&&!['Información complementaria para ubicar el lugar','Observaciones adicionales'].includes(field),value:search?demo.query:demo.fields[key]||'',onChange:(ev:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>search?demo.setQuery(ev.target.value):demo.setFields({...demo.fields,[key]:ev.target.value}),className:'wireframe-field wireframe-position',style};return e.h>=60?<textarea key={index} {...props}/>:<input key={index} {...props} type={type}/>;}
  if(e.kind==='div'){
   const label=elements.find(p=>p.kind==='p'&&p.y>=e.y&&p.y<e.y+e.h&&p.x>=e.x&&p.x<e.x+e.w);
   const isButton=label&&(routes[screen]?.[label.text]||['Manicure','Masajes','Peluquería','Otros','Por nombre','Por categoría','Todas','Pendientes','Sugeridas','Aceptadas','Completadas','Canceladas'].includes(label.text))&&e.h<=40;
   if(isButton&&label){const submit=(screen==='FormularioDeSolicitud'&&label.text==='Continuar')||(screen==='ProponerNuevoHorario'&&label.text==='Enviar propuesta')||(screen==='RechazarSolicitud'&&label.text==='Confirmar rechazo');return <Button key={index} style={style} className="wireframe-position" variant={e.color==='333333'||filter===label.text||mode===label.text?'wireframePrimary':'wireframe'} type={submit?'submit':'button'} onClick={submit?undefined:()=>action(label.text,e)}>{label.text}</Button>;}
   const card=e.h>=54&&e.color==='gray50';
   if(card&&screen==='MisSolicitudesYReservas'&&filter!=='Todas') {const state=elements.find(p=>p.y>=e.y&&p.y<e.y+e.h&&['Pendiente','Sugerida','Completada'].includes(p.text))?.text;if(state&&filter!==`${state}s`)return null;}
   return <div key={index} style={style} className={`wireframe-position wireframe-rectangle tone-${e.color} edge-${e.border||'none'} ${card?'wireframe-item':''}`} onClick={card&&screen==='ExploracinDeProveedores'?()=>{const name=label?.text;if(name)demo.setProvider(name);go('PerfilDelProveedor');}:card&&screen==='MisSolicitudesYReservas'?()=>go('DetalleDeSolicitudreserva'):undefined} role={card&&['ExploracinDeProveedores','MisSolicitudesYReservas'].includes(screen)?'link':undefined} tabIndex={card&&['ExploracinDeProveedores','MisSolicitudesYReservas'].includes(screen)?0:undefined} onKeyDown={ev=>{if(ev.key==='Enter'&&card)go(screen==='ExploracinDeProveedores'?'PerfilDelProveedor':'DetalleDeSolicitudreserva');}}/>;
  }
  const rect=elements.find(r=>r.kind==='div'&&e.y>=r.y&&e.y<r.y+r.h&&e.x>=r.x&&e.x<r.x+r.w&&r.h<=40);
  if(rect&&(routes[screen]?.[e.text]||['Manicure','Masajes','Peluquería','Otros','Por nombre','Por categoría','Todas','Pendientes','Sugeridas','Aceptadas','Completadas','Canceladas'].includes(e.text)))return null;
  if(screen==='MisSolicitudesYReservas'&&filter!=='Todas'){const card=elements.find(r=>r.kind==='div'&&r.h>=54&&e.y>=r.y&&e.y<r.y+r.h);if(card){const state=elements.find(p=>p.y>=card.y&&p.y<card.y+card.h&&['Pendiente','Sugerida','Completada'].includes(p.text))?.text;if(state&&filter!==`${state}s`)return null;}}
  return <p key={index} style={style} className={`wireframe-position wireframe-text ink-${e.color} ${e.bold?'wireframe-bold':''}`}>{content(e.text)}</p>;
 })}
 </form>
 </main><footer className="prototype-footer"><span>{provider?'PROVEEDOR':'CLIENTE'}</span><Button variant="wireframe" onClick={()=>navigate({to:'/'})}>Volver al inicio</Button></footer></div>;
}
