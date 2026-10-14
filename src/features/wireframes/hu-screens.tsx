import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useStore } from "./store";
import { CATEGORIES, PASSWORD_RULE, dayName, formatDateTime, type Booking, type Role } from "./domain";

export const HU_SCREENS: Record<string, string> = {
  RegistroDeUsuario: "Registro de usuario",
  InicioDeSesion: "Inicio de sesión",
  RecuperacionDeContrasena: "Recuperación de contraseña",
  MiPerfil: "Mi perfil",
  MiCatalogo: "Mi catálogo",
  MiDisponibilidad: "Mi disponibilidad",
  MisSolicitudes: "Mis solicitudes y reservas",
  BandejaProveedor: "Solicitudes recibidas",
  CancelarSolicitud: "Cancelar solicitud o reserva",
  FinalizarReserva: "Finalizar servicio",
  MiAgenda: "Mi agenda",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="web-field-group web-field-wide">
      <label>{label}</label>
      {children}
    </div>
  );
}

function inputClass(): string {
  return "web-field";
}

export function StoreBanner() {
  const store = useStore();
  if (!store.message) return null;
  return (
    <div className="web-item" role="status" style={{ borderLeft: "4px solid var(--wireframe-ink)" }}>
      <div className="web-item-content">
        <p className="web-detail">{store.message}</p>
      </div>
      <Button variant="wireframe" className="web-action" onClick={() => store.setMessage(null)}>
        Cerrar
      </Button>
    </div>
  );
}

function Guard({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const store = useStore();
  const navigate = useNavigate();
  const go = (pantalla: string) => navigate({ to: "/pantallas/$pantalla", params: { pantalla } });
  if (!store.currentUser) {
    return (
      <div className="web-item">
        <div className="web-item-content">
          <h2>Debes iniciar sesión</h2>
          <p className="web-detail">Esta funcionalidad requiere una sesión autenticada.</p>
        </div>
        <Button variant="wireframePrimary" className="web-action" onClick={() => go("InicioDeSesion")}>
          Ir a inicio de sesión
        </Button>
      </div>
    );
  }
  if (roles && !roles.includes(store.currentUser.role)) {
    return (
      <div className="web-item">
        <div className="web-item-content">
          <h2>Acceso denegado</h2>
          <p className="web-detail">Tu rol ({store.currentUser.role}) no puede usar esta funcionalidad.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function BookingDetail({ booking }: { booking: Booking }) {
  const store = useStore();
  return (
    <div className="web-item-content">
      <h2>{booking.serviceName}</h2>
      <p className="web-detail">Proveedor: {store.providerName(booking.providerId)}</p>
      <p className="web-detail">Inicio: {formatDateTime(booking.startISO)}</p>
      <p className="web-detail">Fin: {formatDateTime(booking.endISO)}</p>
      <p className="web-detail">Dirección: {booking.address}, {booking.district}</p>
      {booking.extraInfo && <p className="web-detail">Info: {booking.extraInfo}</p>}
      {booking.notes && <p className="web-detail">Observaciones: {booking.notes}</p>}
      <p className="web-detail">Estado: {booking.status}</p>
      <p className="web-detail">Creada: {formatDateTime(booking.createdAt)}</p>
      <p className="web-detail">Actualizada: {formatDateTime(booking.updatedAt)}</p>
      {booking.proposedStartISO && booking.proposedEndISO && (
        <p className="web-detail">
          Horario propuesto: {formatDateTime(booking.proposedStartISO)} – {formatDateTime(booking.proposedEndISO)}
        </p>
      )}
      {booking.rejectReason && <p className="web-detail">Motivo de rechazo: {booking.rejectReason}</p>}
      {booking.cancelReason && <p className="web-detail">Motivo de cancelación: {booking.cancelReason}</p>}
    </div>
  );
}

// ---- HU-001 ----

export function RegistroDeUsuario() {
  const store = useStore();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Cliente");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <StoreBanner />
      <Field label="Nombre completo">
        <input className={inputClass()} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </Field>
      <Field label="Correo electrónico">
        <input className={inputClass()} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Contraseña">
        <input className={inputClass()} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      <p className="web-detail">{PASSWORD_RULE}</p>
      <div style={{ display: "flex", gap: 12 }}>
        {(["Cliente", "Proveedor"] as Role[]).map((r) => (
          <Button key={r} variant={role === r ? "wireframePrimary" : "wireframe"} className="web-action" onClick={() => setRole(r)} aria-pressed={role === r}>
            {r}
          </Button>
        ))}
      </div>
      <Button
        variant="wireframePrimary"
        className="web-action"
        onClick={() => {
          if (store.register({ nombre, email, password, role })) {
            navigate({ to: "/pantallas/$pantalla", params: { pantalla: "InicioDeSesion" } });
          }
        }}
      >
        Crear cuenta
      </Button>
    </div>
  );
}

// ---- HU-002 ----

export function InicioDeSesion() {
  const store = useStore();
  const navigate = useNavigate();
  const go = (pantalla: string) => navigate({ to: "/pantallas/$pantalla", params: { pantalla } });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  if (store.currentUser) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <StoreBanner />
        <div className="web-item">
          <div className="web-item-content">
            <h2>{store.currentUser.nombre}</h2>
            <p className="web-detail">{store.currentUser.email} · {store.currentUser.role}</p>
          </div>
          <Button variant="wireframe" className="web-action" onClick={store.logout}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <StoreBanner />
      <Field label="Correo electrónico">
        <input className={inputClass()} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Contraseña">
        <input className={inputClass()} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      <Button
        variant="wireframePrimary"
        className="web-action"
        onClick={() => {
          if (store.login(email, password)) go("ExploracinDeProveedores");
        }}
      >
        Ingresar
      </Button>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Button variant="wireframe" className="web-action" onClick={() => go("RegistroDeUsuario")}>
          Crear cuenta
        </Button>
        <Button variant="wireframe" className="web-action" onClick={() => go("RecuperacionDeContrasena")}>
          Recuperar contraseña
        </Button>
      </div>
      <p className="web-detail">Cuentas demo: cliente@demo.com / Cliente123 · proveedor@demo.com / Proveedor123</p>
    </div>
  );
}

// ---- HU-003 ----

export function RecuperacionDeContrasena() {
  const store = useStore();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [verified, setVerified] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <StoreBanner />
      {!sent ? (
        <>
          <Field label="Correo electrónico de la cuenta">
            <input className={inputClass()} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Button
            variant="wireframePrimary"
            className="web-action"
            onClick={() => {
              if (!email.trim()) {
                store.setMessage("El correo electrónico es obligatorio.");
                return;
              }
              store.requestRecovery(email);
              setSent(true);
              setVerified(false);
            }}
          >
            Solicitar código
          </Button>
        </>
      ) : (
        <>
          {store.demoMailbox && <p className="web-detail">{store.demoMailbox}</p>}
          <Field label="Código de 6 dígitos">
            <input className={inputClass()} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required />
          </Field>
          {!verified ? (
            <Button
              variant="wireframePrimary"
              className="web-action"
              onClick={() => {
                if (store.checkRecoveryCode(email, code)) setVerified(true);
              }}
            >
              Validar código
            </Button>
          ) : (
            <>
              <Field label="Nueva contraseña">
                <input className={inputClass()} type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
              </Field>
              <p className="web-detail">{PASSWORD_RULE}</p>
              <Button
                variant="wireframePrimary"
                className="web-action"
                onClick={() => {
                  if (store.resetPassword(email, code, next)) {
                    setSent(false);
                    setCode("");
                    setNext("");
                    setVerified(false);
                  }
                }}
              >
                Restablecer contraseña
              </Button>
            </>
          )}
          <Button
            variant="wireframe"
            className="web-action"
            onClick={() => {
              store.requestRecovery(email);
              setVerified(false);
            }}
          >
            Solicitar un código nuevo (invalida el anterior)
          </Button>
        </>
      )}
    </div>
  );
}

// ---- HU-004 / HU-005 ----

export function MiPerfil() {
  const store = useStore();
  const user = store.currentUser;
  const [nombre, setNombre] = useState(user?.nombre ?? "");
  const [direccion, setDireccion] = useState(user?.direccion ?? "");
  const [presentacion, setPresentacion] = useState(user?.presentacion ?? "");
  const [zonas, setZonas] = useState((user?.zonas ?? []).join(", "));
  if (!user) {
    return (
      <Guard>
        <></>
      </Guard>
    );
  }
  return (
    <Guard>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <StoreBanner />
        <div className="web-item">
          <div className="web-item-content">
            <h2>{user.nombre}</h2>
            <p className="web-detail">{user.email} · {user.role}</p>
          </div>
        </div>
        {user.role === "Cliente" ? (
          <>
            <Field label="Nombre completo">
              <input className={inputClass()} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </Field>
            <Field label="Dirección principal">
              <input className={inputClass()} value={direccion} onChange={(e) => setDireccion(e.target.value)} required />
            </Field>
            <Button variant="wireframePrimary" className="web-action" onClick={() => store.saveClientProfile(nombre, direccion)}>
              Guardar cambios
            </Button>
          </>
        ) : (
          <>
            <Field label="Presentación profesional">
              <textarea className={inputClass()} rows={4} value={presentacion} onChange={(e) => setPresentacion(e.target.value)} required />
            </Field>
            <Field label="Zonas de atención (separadas por coma, solo orientativas)">
              <input className={inputClass()} value={zonas} onChange={(e) => setZonas(e.target.value)} />
            </Field>
            <p className="web-detail">Las zonas son información orientativa: no calculan distancias ni validan cobertura.</p>
            <Button variant="wireframePrimary" className="web-action" onClick={() => store.saveProviderProfile(presentacion, zonas)}>
              Guardar cambios
            </Button>
          </>
        )}
      </div>
    </Guard>
  );
}

// ---- HU-006 / HU-007 / HU-008 ----

export function MiCatalogo() {
  const store = useStore();
  const user = store.currentUser;
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<string>(CATEGORIES[0]);
  const [descripcion, setDescripcion] = useState("");
  const [duracion, setDuracion] = useState("45");
  const [precio, setPrecio] = useState("35000");
  const [mediaFor, setMediaFor] = useState<string | null>(null);
  const [mediaRef, setMediaRef] = useState("");
  const [mediaKind, setMediaKind] = useState<"foto" | "video">("foto");
  const [insumosFor, setInsumosFor] = useState<string | null>(null);
  const [insumos, setInsumos] = useState("");
  const mine = store.services.filter((s) => s.providerId === user?.id);
  return (
    <Guard roles={["Proveedor"]}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <StoreBanner />
        {mine.map((s) => (
          <article key={s.id} className="web-item">
            <div className="web-item-content">
              <h2>{s.nombre}</h2>
              <p className="web-detail">{s.categoria} · ${s.precio} · {s.duracionMin} min · {s.estado}</p>
              <p className="web-detail">{s.descripcion}</p>
              {s.fotos.length > 0 && <p className="web-detail">Fotos: {s.fotos.join(", ")}</p>}
              {s.videos.length > 0 && <p className="web-detail">Videos: {s.videos.join(", ")}</p>}
              {s.insumos && <p className="web-detail">Insumos/equipos: {s.insumos}</p>}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button
                variant="wireframe"
                className="web-action"
                onClick={() => store.toggleService(s.id, s.estado === "Activo" ? "Inactivo" : "Activo")}
              >
                {s.estado === "Activo" ? "Desactivar" : "Activar"}
              </Button>
              <Button variant="wireframe" className="web-action" onClick={() => { setMediaFor(s.id); setMediaRef(""); }}>
                Agregar foto/video
              </Button>
              <Button variant="wireframe" className="web-action" onClick={() => { setInsumosFor(s.id); setInsumos(s.insumos); }}>
                Registrar insumos
              </Button>
            </div>
            {mediaFor === s.id && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", width: "100%" }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <Button variant={mediaKind === "foto" ? "wireframePrimary" : "wireframe"} className="web-action" onClick={() => setMediaKind("foto")}>
                    Foto
                  </Button>
                  <Button variant={mediaKind === "video" ? "wireframePrimary" : "wireframe"} className="web-action" onClick={() => setMediaKind("video")}>
                    Video
                  </Button>
                </div>
                <input className={inputClass()} placeholder="URL o referencia" value={mediaRef} onChange={(e) => setMediaRef(e.target.value)} style={{ flex: 1 }} />
                <Button
                  variant="wireframePrimary"
                  className="web-action"
                  onClick={() => {
                    if (store.addMedia(s.id, mediaKind, mediaRef)) {
                      setMediaFor(null);
                      setMediaRef("");
                    }
                  }}
                >
                  Asociar
                </Button>
              </div>
            )}
            {insumosFor === s.id && (
              <div style={{ display: "flex", gap: 12, width: "100%" }}>
                <input className={inputClass()} placeholder="Productos, insumos o equipos" value={insumos} onChange={(e) => setInsumos(e.target.value)} style={{ flex: 1 }} />
                <Button
                  variant="wireframePrimary"
                  className="web-action"
                  onClick={() => {
                    if (store.saveInsumos(s.id, insumos)) setInsumosFor(null);
                  }}
                >
                  Guardar
                </Button>
              </div>
            )}
          </article>
        ))}
        {mine.length === 0 && <p className="web-detail">Aún no tienes servicios registrados.</p>}
        <h2 className="web-section-title">Registrar servicio</h2>
        <Field label="Nombre">
          <input className={inputClass()} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </Field>
        <Field label="Categoría (solo estética, bienestar o masajes no médicos)">
          <select className={inputClass()} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Descripción">
          <textarea className={inputClass()} rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
        </Field>
        <Field label="Duración estimada (minutos, 15–480)">
          <input className={inputClass()} inputMode="numeric" value={duracion} onChange={(e) => setDuracion(e.target.value)} required />
        </Field>
        <Field label="Precio (COP, entero mayor que cero)">
          <input className={inputClass()} inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
        </Field>
        <Button
          variant="wireframePrimary"
          className="web-action"
          onClick={() => {
            if (
              store.addService({
                nombre,
                categoria,
                descripcion,
                duracionMin: Number(duracion),
                precio: Number(precio),
              })
            ) {
              setNombre("");
              setDescripcion("");
              setDuracion("45");
              setPrecio("35000");
            }
          }}
        >
          Registrar servicio
        </Button>
      </div>
    </Guard>
  );
}

// ---- HU-011 ----

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function MiDisponibilidad() {
  const store = useStore();
  const user = store.currentUser;
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("18:00");
  const [pStart, setPStart] = useState("");
  const [pEnd, setPEnd] = useState("");
  const mine = user ? (store.slots[user.id] ?? []) : [];
  const blocked = user ? (store.unavailable[user.id] ?? []) : [];
  return (
    <Guard roles={["Proveedor"]}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <StoreBanner />
        <h2 className="web-section-title">Días y horarios de atención</h2>
        {mine.length === 0 && <p className="web-detail">Sin franjas registradas.</p>}
        {mine.map((s, i) => (
          <p key={i} className="web-detail">{dayName(s.day)}: {s.start} – {s.end}</p>
        ))}
        <Field label="Día">
          <select className={inputClass()} value={day} onChange={(e) => setDay(e.target.value)}>
            {DAYS.map((d) => (
              <option key={d} value={d}>{dayName(d)}</option>
            ))}
          </select>
        </Field>
        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Hora inicial">
            <input className={inputClass()} type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
          </Field>
          <Field label="Hora final">
            <input className={inputClass()} type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </Field>
        </div>
        <Button variant="wireframePrimary" className="web-action" onClick={() => store.addSlot(Number(day), start, end)}>
          Registrar horario
        </Button>
        <h2 className="web-section-title">Periodos no disponibles</h2>
        {blocked.length === 0 && <p className="web-detail">Sin periodos registrados.</p>}
        {blocked.map((p, i) => (
          <p key={i} className="web-detail">{p.start} al {p.end}</p>
        ))}
        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Fecha inicio">
            <input className={inputClass()} type="date" value={pStart} onChange={(e) => setPStart(e.target.value)} required />
          </Field>
          <Field label="Fecha fin">
            <input className={inputClass()} type="date" value={pEnd} onChange={(e) => setPEnd(e.target.value)} required />
          </Field>
        </div>
        <Button variant="wireframePrimary" className="web-action" onClick={() => store.addUnavailability(pStart, pEnd)}>
          Registrar periodo
        </Button>
      </div>
    </Guard>
  );
}

// ---- HU-013 / HU-016 ----

export function MisSolicitudes() {
  const store = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const list = store.myBookings();
  const detail = list.find((b) => b.id === selected);
  return (
    <Guard roles={["Cliente"]}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <StoreBanner />
        {list.length === 0 && <p className="web-detail">No existen registros para mostrar.</p>}
        {!detail &&
          list.map((b) => (
            <article key={b.id} className="web-item">
              <div className="web-item-content">
                <h2>{b.serviceName}</h2>
                <p className="web-detail">Proveedor: {store.providerName(b.providerId)}</p>
                <p className="web-detail">{formatDateTime(b.startISO)} · {b.status}</p>
              </div>
              <Button variant="wireframe" className="web-action" onClick={() => setSelected(b.id)}>
                Ver detalle
              </Button>
            </article>
          ))}
        {detail && (
          <article className="web-item">
            <BookingDetail booking={detail} />
            {detail.status === "Sugerida" && detail.proposedStartISO && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Button
                  variant="wireframePrimary"
                  className="web-action"
                  onClick={() => {
                    if (store.acceptCounter(detail.id)) setSelected(null);
                  }}
                >
                  Aceptar horario sugerido
                </Button>
                <Button
                  variant="wireframe"
                  className="web-action"
                  onClick={() => {
                    if (store.rejectCounter(detail.id)) setSelected(null);
                  }}
                >
                  Rechazar horario
                </Button>
              </div>
            )}
            {(detail.status === "Pendiente" || detail.status === "Sugerida" || detail.status === "Aceptada") && (
              <Button
                variant="wireframe"
                className="web-action"
                onClick={() => {
                  store.setActiveBookingId(detail.id);
                }}
              >
                <CancelShortcut bookingId={detail.id} />
              </Button>
            )}
            <Button variant="wireframe" className="web-action" onClick={() => setSelected(null)}>
              Volver a mis solicitudes
            </Button>
          </article>
        )}
      </div>
    </Guard>
  );
}

function CancelShortcut({ bookingId }: { bookingId: string }) {
  const navigate = useNavigate();
  return (
    <span
      onClick={() => navigate({ to: "/pantallas/$pantalla", params: { pantalla: "CancelarSolicitud" } })}
    >
      Cancelar esta solicitud (id: {bookingId.slice(-4)})
    </span>
  );
}

// ---- HU-014 / HU-015 ----

export function BandejaProveedor() {
  const store = useStore();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const list = store.inbox();
  const detail = list.find((b) => b.id === selected);
  return (
    <Guard roles={["Proveedor"]}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <StoreBanner />
        {list.length === 0 && <p className="web-detail">No tienes solicitudes recibidas.</p>}
        {!detail &&
          list.map((b) => (
            <article key={b.id} className="web-item">
              <div className="web-item-content">
                <h2>{b.serviceName}</h2>
                <p className="web-detail">Cliente: {store.userById(b.clientId)?.nombre} · {formatDateTime(b.startISO)} · {b.status}</p>
              </div>
              <Button variant="wireframe" className="web-action" onClick={() => { setSelected(b.id); store.setActiveBookingId(b.id); }}>
                Ver detalle
              </Button>
            </article>
          ))}
        {detail && (
          <article className="web-item">
            <BookingDetail booking={detail} />
            {detail.status === "Pendiente" && (
              <>
                <Button
                  variant="wireframePrimary"
                  className="web-action"
                  onClick={() => {
                    if (store.acceptBooking(detail.id)) {
                      navigate({ to: "/pantallas/$pantalla", params: { pantalla: "BandejaProveedor" } });
                      setSelected(null);
                    }
                  }}
                >
                  Aceptar solicitud
                </Button>
                <Field label="Motivo del rechazo (obligatorio para rechazar)">
                  <input className={inputClass()} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                </Field>
                <Button
                  variant="wireframe"
                  className="web-action"
                  onClick={() => {
                    if (store.rejectBooking(detail.id, motivo)) setSelected(null);
                  }}
                >
                  Rechazar con motivo
                </Button>
                <div style={{ display: "flex", gap: 12 }}>
                  <Field label="Nueva fecha">
                    <input className={inputClass()} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                  </Field>
                  <Field label="Nueva hora">
                    <input className={inputClass()} type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
                  </Field>
                </div>
                <Button
                  variant="wireframe"
                  className="web-action"
                  onClick={() => {
                    if (store.counterBooking(detail.id, fecha, hora)) setSelected(null);
                  }}
                >
                  Proponer otro horario
                </Button>
              </>
            )}
            <Button variant="wireframe" className="web-action" onClick={() => setSelected(null)}>
              Volver a recibidas
            </Button>
          </article>
        )}
      </div>
    </Guard>
  );
}

// ---- HU-017 ----

export function CancelarSolicitud() {
  const store = useStore();
  const navigate = useNavigate();
  const user = store.currentUser;
  const [motivo, setMotivo] = useState("");
  const candidates = store.bookings.filter((b) => {
    if (!user) return false;
    if (user.role === "Cliente" && b.clientId === user.id) {
      return b.status === "Pendiente" || b.status === "Sugerida" || b.status === "Aceptada";
    }
    if (user.role === "Proveedor" && b.providerId === user.id) {
      return b.status === "Aceptada";
    }
    return false;
  });
  const preselected = store.activeBookingId && candidates.some((b) => b.id === store.activeBookingId)
    ? store.activeBookingId
    : null;
  const [selected, setSelected] = useState<string | null>(preselected);
  const detail = candidates.find((b) => b.id === (selected ?? preselected));
  return (
    <Guard>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <StoreBanner />
        {candidates.length === 0 && <p className="web-detail">No tienes solicitudes o reservas que puedas cancelar.</p>}
        {!detail &&
          candidates.map((b) => (
            <article key={b.id} className="web-item">
              <div className="web-item-content">
                <h2>{b.serviceName}</h2>
                <p className="web-detail">{formatDateTime(b.startISO)} · {b.status}</p>
              </div>
              <Button variant="wireframe" className="web-action" onClick={() => setSelected(b.id)}>
                Cancelar esta
              </Button>
            </article>
          ))}
        {detail && (
          <article className="web-item">
            <BookingDetail booking={detail} />
            <Field label="Motivo de la cancelación (obligatorio, 3–500 caracteres)">
              <input className={inputClass()} value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
            </Field>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button
                variant="wireframePrimary"
                className="web-action"
                onClick={() => {
                  if (store.cancel(detail.id, motivo)) {
                    setSelected(null);
                    setMotivo("");
                    navigate({ to: "/pantallas/$pantalla", params: { pantalla: user?.role === "Cliente" ? "MisSolicitudes" : "BandejaProveedor" } });
                  }
                }}
              >
                Confirmar cancelación
              </Button>
              <Button variant="wireframe" className="web-action" onClick={() => setSelected(null)}>
                Volver
              </Button>
            </div>
          </article>
        )}
      </div>
    </Guard>
  );
}

// ---- HU-018 ----

export function FinalizarReserva() {
  const store = useStore();
  const mine = store.bookings.filter(
    (b) => store.currentUser && b.providerId === store.currentUser.id && b.status === "Aceptada",
  );
  return (
    <Guard roles={["Proveedor"]}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <StoreBanner />
        {mine.length === 0 && <p className="web-detail">No tienes reservas aceptadas por finalizar.</p>}
        {mine.map((b) => (
          <article key={b.id} className="web-item">
            <div className="web-item-content">
              <h2>{b.serviceName}</h2>
              <p className="web-detail">{formatDateTime(b.startISO)} · {b.address}, {b.district}</p>
            </div>
            <Button variant="wireframePrimary" className="web-action" onClick={() => store.complete(b.id)}>
              Marcar como Completada
            </Button>
          </article>
        ))}
      </div>
    </Guard>
  );
}

// ---- HU-019 ----

export function MiAgenda() {
  const store = useStore();
  const list = store.agenda();
  return (
    <Guard roles={["Proveedor"]}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <StoreBanner />
        {list.length === 0 && <p className="web-detail">No existen reservas aceptadas para mostrar.</p>}
        {list.map((b) => (
          <article key={b.id} className="web-item">
            <div className="web-item-content">
              <h2>{b.serviceName}</h2>
              <p className="web-detail">Inicio: {formatDateTime(b.startISO)}</p>
              <p className="web-detail">Fin: {formatDateTime(b.endISO)}</p>
              <p className="web-detail">Dirección: {b.address}, {b.district}</p>
            </div>
          </article>
        ))}
      </div>
    </Guard>
  );
}

export function HuScreen({ screen }: { screen: string }) {
  switch (screen) {
    case "RegistroDeUsuario":
      return <RegistroDeUsuario />;
    case "InicioDeSesion":
      return <InicioDeSesion />;
    case "RecuperacionDeContrasena":
      return <RecuperacionDeContrasena />;
    case "MiPerfil":
      return <MiPerfil />;
    case "MiCatalogo":
      return <MiCatalogo />;
    case "MiDisponibilidad":
      return <MiDisponibilidad />;
    case "MisSolicitudes":
      return <MisSolicitudes />;
    case "BandejaProveedor":
      return <BandejaProveedor />;
    case "CancelarSolicitud":
      return <CancelarSolicitud />;
    case "FinalizarReserva":
      return <FinalizarReserva />;
    case "MiAgenda":
      return <MiAgenda />;
    default:
      return null;
  }
}
