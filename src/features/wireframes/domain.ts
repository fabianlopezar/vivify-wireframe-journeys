// Dominio hardcodeado en memoria (sin backend ni dependencias nuevas).
// Todo vive en el React context de la sesión y se pierde al recargar,
// igual que el resto del prototipo. Las reglas implementan los criterios
// de aceptación de las HU-001 a HU-019 a nivel de validación frontal.
//
// Decisiones de proyecto (el PDF las deja "condicionadas", aquí se fijan):
// - Contraseña: mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.
// - Correo: se normaliza a minúsculas y es único en el sistema.
// - Cuentas nuevas quedan activas de inmediato.
// - Sesión simulada: token opaco, expira a los 60 min, sin renovación;
//   cerrar sesión la invalida. (El backend real debe usar JWT o equivalente.)
// - "Hash" de demostración: sal por usuario + hash no criptográfico.
//   El backend real DEBE usar bcrypt/argon2/scrypt con sal.
// - Recuperación: OTP de 6 dígitos, vigencia 10 min, un solo uso, máximo
//   5 intentos; una nueva solicitud invalida el código anterior. El "correo"
//   se simula mostrando el código en pantalla (no hay envío real).
// - Categorías PMV: estética, bienestar y masajes no médicos (lista fija).
// - Servicio: precio entero COP > 0, duración 15–480 min, estado inicial Activo.
// - Multimedia: máximo 5 fotos y 5 videos (URL o referencia) por servicio.
// - Disponibilidad: la hora inicial debe ser anterior a la final; no se
//   admiten franjas superpuestas del mismo día. Periodos no disponibles
//   con fecha inicio <= fecha fin.
// - Solicitudes: solo fechas futuras, servicio Activo, intervalo completo
//   [inicio, fin) dentro de la disponibilidad y fuera de periodos no
//   disponibles. Sin validación geográfica (solo se conserva la dirección).
// - Aceptación (HU-015/HU-016): operación atómica — en JS monohilo, la
//   actualización funcional de estado es comparar-e-intercambiar: se
//   revalidan disponibilidad y solapamientos dentro de la misma
//   actualización, así como máximo una solicitud se confirma. El backend
//   real DEBE usar transacción + bloqueo de fila o equivalente y justificarlo.
// - Motivo de cancelación/rechazo: obligatorio, 3–500 caracteres.
// - Solo el Cliente dueño cancela Pendiente/Sugerida/Aceptada; el Proveedor
//   solo cancela reservas Aceptadas propias. Completada/Cancelada/Rechazada
//   no se pueden cancelar ni completar de nuevo.

export type Role = "Cliente" | "Proveedor";
export type ServiceState = "Activo" | "Inactivo";
export type BookingStatus =
  | "Pendiente"
  | "Sugerida"
  | "Aceptada"
  | "Rechazada"
  | "Cancelada"
  | "Completada";

export interface User {
  id: string;
  nombre: string;
  email: string;
  hash: string;
  salt: string;
  role: Role;
  direccion?: string;
  presentacion?: string;
  zonas?: string[];
}

export interface Service {
  id: string;
  providerId: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  duracionMin: number;
  precio: number;
  estado: ServiceState;
  fotos: string[];
  videos: string[];
  insumos: string;
}

export interface DaySlot {
  day: number; // 0 = domingo … 6 = sábado
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export interface UnavailablePeriod {
  start: string; // "YYYY-MM-DD"
  end: string; // "YYYY-MM-DD"
}

export interface Booking {
  id: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  serviceName: string;
  price: number;
  durationMin: number;
  startISO: string;
  endISO: string;
  address: string;
  district: string;
  extraInfo: string;
  notes: string;
  status: BookingStatus;
  proposedStartISO?: string;
  proposedEndISO?: string;
  rejectReason?: string;
  cancelReason?: string;
  cancelledBy?: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Recovery {
  email: string;
  code: string;
  expiresAt: number;
  attempts: number;
  used: boolean;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: number;
}

export type Result<T = undefined> =
  | { ok: true; message: string; data: T }
  | { ok: false; message: string };

export const CATEGORIES = [
  "Manicure",
  "Pedicure",
  "Peluquería",
  "Maquillaje",
  "Masajes",
  "Depilación",
  "Corte de cabello",
  "Limpieza facial",
] as const;

export const PASSWORD_RULE =
  "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push("mínimo 8 caracteres");
  if (!/[A-Z]/.test(password)) issues.push("una mayúscula");
  if (!/[a-z]/.test(password)) issues.push("una minúscula");
  if (!/[0-9]/.test(password)) issues.push("un número");
  return issues;
}

// Hash SOLO para la demo (no es seguro). El backend real debe usar
// bcrypt/argon2 con sal. Determinista para poder verificar el login.
export function demoSalt(seed = ""): string {
  let h = 2166136261;
  const s = `demo-salt:${seed}:${Date.now()}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function demoHash(password: string, salt: string): string {
  let h1 = 5381;
  let h2 = 52711;
  const s = `${salt}::${password}::${salt}`;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1, 33) ^ c;
    h2 = Math.imul(h2, 33) ^ (c + i);
  }
  return `${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
}

export function makeUser(
  id: string,
  nombre: string,
  email: string,
  password: string,
  role: Role,
  extra: Partial<User> = {},
): User {
  const salt = demoSalt(id);
  return {
    id,
    nombre,
    email: normalizeEmail(email),
    hash: demoHash(password, salt),
    salt,
    role,
    ...extra,
  };
}

// ---- Datos iniciales hardcodeados (cuentas demo) ----
// cliente@demo.com / Cliente123 · proveedor@demo.com / Proveedor123
export function seedUsers(): User[] {
  return [
    makeUser("c1", "Ana Torres", "cliente@demo.com", "Cliente123", "Cliente", {
      direccion: "Cra 10 # 20-30, El Prado",
    }),
    makeUser(
      "p1",
      "María Gómez",
      "proveedor@demo.com",
      "Proveedor123",
      "Proveedor",
      {
        presentacion:
          "Estilista profesional con experiencia en cuidado capilar y manicure a domicilio.",
        zonas: ["Norte de la ciudad"],
      },
    ),
    makeUser("p2", "Carlos Pérez", "carlos@demo.com", "Proveedor123", "Proveedor", {
      presentacion: "Masajista terapéutico y de relajación a domicilio.",
      zonas: ["Centro"],
    }),
    makeUser("p3", "Laura Ruiz", "laura@demo.com", "Proveedor123", "Proveedor", {
      presentacion: "Peluquera y estilista para eventos a domicilio.",
      zonas: ["Sur"],
    }),
  ];
}

export function seedServices(): Service[] {
  return [
    {
      id: "s1",
      providerId: "p1",
      nombre: "Manicure a domicilio",
      categoria: "Manicure",
      descripcion: "Manicure clásica con esmaltado, incluye limado y cuidado de cutículas.",
      duracionMin: 45,
      precio: 35000,
      estado: "Activo",
      fotos: ["Foto de referencia 1"],
      videos: [],
      insumos: "Esmaltes, kit de manicure profesional, toalla desechable.",
    },
    {
      id: "s2",
      providerId: "p1",
      nombre: "Peinado para evento",
      categoria: "Peluquería",
      descripcion: "Peinado para eventos sociales a domicilio.",
      duracionMin: 60,
      precio: 50000,
      estado: "Activo",
      fotos: [],
      videos: [],
      insumos: "Secador, plancha y fijador profesional.",
    },
    {
      id: "s3",
      providerId: "p1",
      nombre: "Corte de cabello",
      categoria: "Corte de cabello",
      descripcion: "Corte de cabello a domicilio.",
      duracionMin: 30,
      precio: 28000,
      estado: "Activo",
      fotos: [],
      videos: [],
      insumos: "Tijeras, capa y peine profesional.",
    },
    {
      id: "s4",
      providerId: "p2",
      nombre: "Masaje relajante",
      categoria: "Masajes",
      descripcion: "Masaje corporal relajante de cuerpo completo.",
      duracionMin: 60,
      precio: 60000,
      estado: "Activo",
      fotos: [],
      videos: [],
      insumos: "Aceites esenciales y camilla portátil.",
    },
  ];
}

export function seedSlots(): Record<string, DaySlot[]> {
  const week: DaySlot[] = [1, 2, 3, 4, 5].map((day) => ({
    day,
    start: "08:00",
    end: "18:00",
  }));
  const sat: DaySlot[] = [{ day: 6, start: "09:00", end: "13:00" }];
  return { p1: [...week, ...sat], p2: [...week], p3: [...sat] };
}

export function seedUnavailable(): Record<string, UnavailablePeriod[]> {
  return { p1: [], p2: [], p3: [] };
}

function stamp(day: string, time: string): string {
  return `${day}T${time}:00`;
}

export function seedBookings(): Booking[] {
  return [
    {
      id: "b1",
      clientId: "c1",
      providerId: "p1",
      serviceId: "s1",
      serviceName: "Manicure a domicilio",
      price: 35000,
      durationMin: 45,
      startISO: stamp("2026-09-12", "15:00"),
      endISO: stamp("2026-09-12", "15:45"),
      address: "Cra 10 # 20-30",
      district: "El Prado",
      extraInfo: "Casa color blanco, portón negro.",
      notes: "Ninguna.",
      status: "Pendiente",
      createdAt: stamp("2026-09-10", "10:00"),
      updatedAt: stamp("2026-09-10", "10:00"),
    },
    {
      id: "b2",
      clientId: "c1",
      providerId: "p1",
      serviceId: "s1",
      serviceName: "Manicure a domicilio",
      price: 35000,
      durationMin: 45,
      startISO: stamp("2026-09-12", "15:00"),
      endISO: stamp("2026-09-12", "15:45"),
      address: "Cra 10 # 20-30",
      district: "El Prado",
      extraInfo: "Casa color blanco.",
      notes: "Ninguna.",
      status: "Sugerida",
      proposedStartISO: stamp("2026-09-13", "17:00"),
      proposedEndISO: stamp("2026-09-13", "17:45"),
      createdAt: stamp("2026-09-10", "10:05"),
      updatedAt: stamp("2026-09-11", "09:00"),
    },
    {
      id: "b3",
      clientId: "c1",
      providerId: "p2",
      serviceId: "s4",
      serviceName: "Masaje relajante",
      price: 60000,
      durationMin: 60,
      startISO: stamp("2026-09-15", "10:00"),
      endISO: stamp("2026-09-15", "11:00"),
      address: "Calle 5 # 8-12",
      district: "Centro",
      extraInfo: "Apartamento 301.",
      notes: "Ninguna.",
      status: "Aceptada",
      createdAt: stamp("2026-09-09", "08:00"),
      updatedAt: stamp("2026-09-09", "12:00"),
    },
    {
      id: "b4",
      clientId: "c1",
      providerId: "p1",
      serviceId: "s2",
      serviceName: "Peinado para evento",
      price: 50000,
      durationMin: 60,
      startISO: stamp("2026-09-01", "10:00"),
      endISO: stamp("2026-09-01", "11:00"),
      address: "Cra 10 # 20-30",
      district: "El Prado",
      extraInfo: "",
      notes: "Ninguna.",
      status: "Completada",
      createdAt: stamp("2026-08-28", "09:00"),
      updatedAt: stamp("2026-09-01", "11:00"),
    },
  ];
}

// ---- Utilidades de tiempo e intervalos ----

export function toMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function addMinutesISO(startISO: string, minutes: number): string {
  const d = new Date(startISO);
  d.setMinutes(d.getMinutes() + minutes);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

export function intervalsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function datePart(iso: string): string {
  return iso.slice(0, 10);
}

function timePart(iso: string): string {
  return iso.slice(11, 16);
}

function dayOfWeek(iso: string): number {
  return new Date(iso).getDay();
}

/** El intervalo completo [start, end) debe caber en una franja del día
 *  y no tocar ningún periodo no disponible. Sin geografía (HU-011/HU-012). */
export function withinAvailability(
  startISO: string,
  endISO: string,
  slots: DaySlot[],
  unavailable: UnavailablePeriod[],
): { ok: boolean; reason?: string } {
  const day = dayOfWeek(startISO);
  const s = toMinutes(timePart(startISO));
  const e = toMinutes(timePart(endISO));
  if (datePart(startISO) !== datePart(endISO)) {
    return { ok: false, reason: "El servicio debe iniciar y terminar el mismo día." };
  }
  const fits = slots.some(
    (slot) => slot.day === day && toMinutes(slot.start) <= s && e <= toMinutes(slot.end),
  );
  if (!fits) return { ok: false, reason: "El horario no se encuentra disponible." };
  const d = datePart(startISO);
  const blocked = unavailable.some((p) => p.start <= d && d <= p.end);
  if (blocked) return { ok: false, reason: "El horario no se encuentra disponible." };
  return { ok: true };
}

/** Periodos ocupados por reservas aceptadas (excluye una si se indica). */
export function acceptedPeriods(bookings: Booking[], providerId: string, excludeId?: string) {
  return bookings.filter(
    (b) => b.providerId === providerId && b.status === "Aceptada" && b.id !== excludeId,
  );
}

export function findOverlap(
  startISO: string,
  endISO: string,
  bookings: Booking[],
  providerId: string,
  excludeId?: string,
): Booking | undefined {
  return acceptedPeriods(bookings, providerId, excludeId).find((b) =>
    intervalsOverlap(startISO, endISO, b.startISO, b.endISO),
  );
}

// ---- HU-001 Registro ----

export function validateRegistration(input: {
  nombre: string;
  email: string;
  password: string;
  role: string;
}): Result {
  if (!input.nombre.trim()) return { ok: false, message: "El nombre es obligatorio." };
  if (!input.email.trim()) return { ok: false, message: "El correo electrónico es obligatorio." };
  if (!isValidEmail(input.email)) {
    return { ok: false, message: "El formato del correo electrónico no es válido." };
  }
  if (input.role !== "Cliente" && input.role !== "Proveedor") {
    return { ok: false, message: 'El tipo de usuario debe ser "Cliente" o "Proveedor".' };
  }
  const issues = passwordIssues(input.password);
  if (issues.length > 0) {
    return { ok: false, message: `La contraseña no es válida: falta ${issues.join(", ")}.` };
  }
  return { ok: true, message: "Datos válidos.", data: undefined };
}

export function registerUser(
  users: User[],
  input: { nombre: string; email: string; password: string; role: string },
): Result<User> {
  const valid = validateRegistration(input);
  if (!valid.ok) return valid as Result<User>;
  const email = normalizeEmail(input.email);
  if (users.some((u) => u.email === email)) {
    return { ok: false, message: "Ya existe una cuenta con ese correo electrónico." } as Result<User>;
  }
  const user = makeUser(
    `u${Date.now()}`,
    input.nombre.trim(),
    email,
    input.password,
    input.role as Role,
  );
  return { ok: true, message: "Cuenta creada correctamente.", data: user };
}

// ---- HU-002 Sesión ----

export function loginUser(users: User[], email: string, password: string): Result<User> {
  if (!email.trim() || !password) {
    return { ok: false, message: "El correo y la contraseña son obligatorios." } as Result<User>;
  }
  const user = users.find((u) => u.email === normalizeEmail(email));
  // Mensaje genérico: no revela cuál credencial falló (HU-002 CA-2).
  if (!user || user.hash !== demoHash(password, user.salt)) {
    return { ok: false, message: "Las credenciales no son válidas." } as Result<User>;
  }
  return { ok: true, message: `Bienvenido, ${user.nombre}.`, data: user };
}

export function canAccess(user: User | undefined, allowed: Role[]): boolean {
  return !!user && allowed.includes(user.role);
}

// ---- HU-003 Recuperación (OTP simulado) ----

export function requestRecoveryCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function startRecovery(
  users: User[],
  recoveries: Recovery[],
  email: string,
  now: number,
): { recoveries: Recovery[]; demoCode: string | null } {
  const user = users.find((u) => u.email === normalizeEmail(email));
  if (!user) return { recoveries, demoCode: null };
  const code = requestRecoveryCode();
  const next = recoveries.filter((r) => r.email !== user.email);
  next.push({ email: user.email, code, expiresAt: now + 10 * 60 * 1000, attempts: 0, used: false });
  return { recoveries: next, demoCode: code };
}

export function verifyRecoveryCode(
  recoveries: Recovery[],
  email: string,
  code: string,
  now: number,
): Result {
  const rec = recoveries.find((r) => r.email === normalizeEmail(email) && !r.used);
  if (!rec) return { ok: false, message: "No hay una solicitud de recuperación vigente." };
  if (now > rec.expiresAt) return { ok: false, message: "El mecanismo ya no es válido." };
  if (rec.attempts >= 5) return { ok: false, message: "Se superó el número máximo de intentos." };
  if (rec.code !== code.trim()) return { ok: false, message: "El código no es válido." };
  return { ok: true, message: "Código válido.", data: undefined };
}

export function resetPasswordWithCode(
  users: User[],
  recoveries: Recovery[],
  email: string,
  code: string,
  newPassword: string,
  now: number,
): Result<{ users: User[]; recoveries: Recovery[] }> {
  const normalized = normalizeEmail(email);
  const idx = recoveries.findIndex((r) => r.email === normalized && !r.used);
  if (idx < 0) return { ok: false, message: "No hay una solicitud de recuperación vigente." };
  const rec = recoveries[idx];
  if (!rec) return { ok: false, message: "No hay una solicitud de recuperación vigente." };
  if (now > rec.expiresAt) return { ok: false, message: "El mecanismo ya no es válido." };
  if (rec.code !== code.trim()) {
    const next = [...recoveries];
    next[idx] = { ...rec, attempts: rec.attempts + 1 };
    return { ok: false, message: "El código no es válido." };
  }
  const issues = passwordIssues(newPassword);
  if (issues.length > 0) {
    return { ok: false, message: `La nueva contraseña no es válida: falta ${issues.join(", ")}.` };
  }
  const salt = demoSalt(normalized + now);
  const usersNext = users.map((u) =>
    u.email === normalized ? { ...u, hash: demoHash(newPassword, salt), salt } : u,
  );
  const recNext = [...recoveries];
  recNext[idx] = { ...rec, used: true };
  return { ok: true, message: "Contraseña actualizada. Ya puedes iniciar sesión.", data: { users: usersNext, recoveries: recNext } };
}

// ---- HU-004 / HU-005 Perfiles ----

export function updateClientProfile(
  user: User,
  input: { nombre: string; direccion: string },
): Result<Partial<User>> {
  if (user.role !== "Cliente") return { ok: false, message: "Operación no permitida para este rol." };
  if (!input.nombre.trim()) return { ok: false, message: "El nombre es obligatorio." };
  if (!input.direccion.trim()) return { ok: false, message: "La dirección principal es obligatoria." };
  return {
    ok: true,
    message: "Perfil actualizado.",
    data: { nombre: input.nombre.trim(), direccion: input.direccion.trim() },
  };
}

export function updateProviderProfile(
  user: User,
  input: { presentacion: string; zonas: string[] },
): Result<Partial<User>> {
  if (user.role !== "Proveedor") {
    return { ok: false, message: "Operación no permitida para este rol." };
  }
  if (!input.presentacion.trim()) {
    return { ok: false, message: "La presentación profesional es obligatoria." };
  }
  return {
    ok: true,
    message: "Perfil profesional actualizado.",
    data: { presentacion: input.presentacion.trim(), zonas: input.zonas },
  };
}

// ---- HU-006 / HU-007 / HU-008 Catálogo ----

export function validateServiceInput(input: {
  nombre: string;
  categoria: string;
  descripcion: string;
  duracionMin: number;
  precio: number;
}): Result {
  if (!input.nombre.trim()) return { ok: false, message: "El nombre del servicio es obligatorio." };
  if (!(CATEGORIES as readonly string[]).includes(input.categoria)) {
    return {
      ok: false,
      message: "La categoría debe corresponder a estética, bienestar o masajes no médicos del PMV.",
    };
  }
  if (!input.descripcion.trim()) return { ok: false, message: "La descripción es obligatoria." };
  if (!Number.isInteger(input.duracionMin) || input.duracionMin < 15 || input.duracionMin > 480) {
    return { ok: false, message: "La duración debe estar entre 15 y 480 minutos." };
  }
  if (!Number.isInteger(input.precio) || input.precio <= 0) {
    return { ok: false, message: "El precio debe ser un valor entero mayor que cero." };
  }
  return { ok: true, message: "Datos válidos.", data: undefined };
}

export function createService(
  user: User,
  input: { nombre: string; categoria: string; descripcion: string; duracionMin: number; precio: number },
): Result<Service> {
  if (user.role !== "Proveedor") {
    return { ok: false, message: "Solo un Proveedor puede registrar servicios." } as Result<Service>;
  }
  const valid = validateServiceInput(input);
  if (!valid.ok) return valid as Result<Service>;
  return {
    ok: true,
    message: "Servicio registrado en tu catálogo.",
    data: {
      id: `s${Date.now()}`,
      providerId: user.id,
      nombre: input.nombre.trim(),
      categoria: input.categoria,
      descripcion: input.descripcion.trim(),
      duracionMin: input.duracionMin,
      precio: input.precio,
      estado: "Activo",
      fotos: [],
      videos: [],
      insumos: "",
    },
  };
}

export function setServiceState(
  user: User,
  service: Service,
  estado: ServiceState,
): Result<ServiceState> {
  if (user.role !== "Proveedor" || service.providerId !== user.id) {
    return { ok: false, message: "No puedes modificar un servicio que no es de tu catálogo." };
  }
  return { ok: true, message: `Servicio ${estado === "Activo" ? "activado" : "desactivado"}.`, data: estado };
}

export function addServiceMedia(
  user: User,
  service: Service,
  kind: "foto" | "video",
  ref: string,
): Result<string[]> {
  if (user.role !== "Proveedor" || service.providerId !== user.id) {
    return { ok: false, message: "No puedes modificar un servicio que no es de tu catálogo." };
  }
  if (!ref.trim()) return { ok: false, message: "La referencia es obligatoria." };
  const list = kind === "foto" ? service.fotos : service.videos;
  if (list.length >= 5) return { ok: false, message: "Máximo 5 referencias por servicio." };
  return { ok: true, message: "Referencia asociada al servicio.", data: [...list, ref.trim()] };
}

// ---- HU-011 Disponibilidad ----

export function addDaySlot(slots: DaySlot[], slot: DaySlot): Result<DaySlot> {
  if (slot.day < 0 || slot.day > 6) return { ok: false, message: "El día no es válido." };
  if (!slot.start || !slot.end || toMinutes(slot.start) >= toMinutes(slot.end)) {
    return { ok: false, message: "El rango ingresado no es válido." };
  }
  const clash = slots.some(
    (s) =>
      s.day === slot.day &&
      intervalsOverlap(`xT${s.start}`, `xT${s.end}`, `xT${slot.start}`, `xT${slot.end}`),
  );
  if (clash) return { ok: false, message: "La franja se cruza con otra ya registrada." };
  return { ok: true, message: "Disponibilidad registrada correctamente.", data: slot };
}

export function addUnavailablePeriod(periods: UnavailablePeriod[], p: UnavailablePeriod): Result<UnavailablePeriod> {
  if (!p.start || !p.end || p.start > p.end) {
    return { ok: false, message: "El rango de fechas no es válido." };
  }
  return { ok: true, message: "Periodo no disponible registrado.", data: p };
}

// ---- HU-012 Creación de solicitud ----

export function createBooking(input: {
  client: User;
  provider: User;
  service: Service;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  address: string;
  district: string;
  extraInfo: string;
  notes: string;
  slots: DaySlot[];
  unavailable: UnavailablePeriod[];
  bookings: Booking[];
  nowISO: string;
}): Result<Booking> {
  const { client, provider, service } = input;
  if (client.role !== "Cliente") {
    return { ok: false, message: "Solo un Cliente puede crear solicitudes." } as Result<Booking>;
  }
  if (service.providerId !== provider.id) {
    return { ok: false, message: "El servicio no pertenece al Proveedor indicado." } as Result<Booking>;
  }
  if (service.estado !== "Activo") {
    return { ok: false, message: "El servicio no se encuentra disponible." } as Result<Booking>;
  }
  if (!input.date || !input.time || !input.address.trim() || !input.district.trim()) {
    return { ok: false, message: "Faltan datos obligatorios: fecha, hora, dirección y barrio/sector." } as Result<Booking>;
  }
  const startISO = stamp(input.date, input.time);
  if (startISO <= input.nowISO) {
    return { ok: false, message: "La fecha y hora deben ser futuras." } as Result<Booking>;
  }
  const endISO = addMinutesISO(startISO, service.duracionMin);
  const avail = withinAvailability(startISO, endISO, input.slots, input.unavailable);
  if (!avail.ok) return { ok: false, message: avail.reason ?? "Horario no disponible." } as Result<Booking>;
  const stampNow = input.nowISO;
  return {
    ok: true,
    message: "Solicitud registrada en estado Pendiente.",
    data: {
      id: `b${Date.now()}`,
      clientId: client.id,
      providerId: provider.id,
      serviceId: service.id,
      serviceName: service.nombre,
      price: service.precio,
      durationMin: service.duracionMin,
      startISO,
      endISO,
      address: input.address.trim(),
      district: input.district.trim(),
      extraInfo: input.extraInfo.trim(),
      notes: input.notes.trim(),
      status: "Pendiente",
      createdAt: stampNow,
      updatedAt: stampNow,
    },
  };
}

// ---- HU-015 Respuesta del Proveedor ----

export function providerAccept(
  booking: Booking,
  bookings: Booking[],
  slots: DaySlot[],
  unavailable: UnavailablePeriod[],
  nowISO: string,
): Result<Partial<Booking>> {
  if (booking.status !== "Pendiente") {
    return { ok: false, message: "Solo se puede responder una solicitud en estado Pendiente." };
  }
  const avail = withinAvailability(booking.startISO, booking.endISO, slots, unavailable);
  if (!avail.ok) {
    return { ok: false, message: avail.reason ?? "El horario no se encuentra disponible." };
  }
  const clash = findOverlap(booking.startISO, booking.endISO, bookings, booking.providerId, booking.id);
  if (clash) {
    return { ok: false, message: "Existe un conflicto con otra reserva aceptada." };
  }
  return { ok: true, message: "Solicitud aceptada.", data: { status: "Aceptada", updatedAt: nowISO } };
}

export function providerReject(booking: Booking, motivo: string, nowISO: string): Result<Partial<Booking>> {
  if (booking.status !== "Pendiente") {
    return { ok: false, message: "Solo se puede responder una solicitud en estado Pendiente." };
  }
  if (motivo.trim().length < 3 || motivo.trim().length > 500) {
    return { ok: false, message: "El motivo es obligatorio (3 a 500 caracteres)." };
  }
  return {
    ok: true,
    message: "Solicitud rechazada.",
    data: { status: "Rechazada", rejectReason: motivo.trim(), updatedAt: nowISO },
  };
}

export function providerCounterPropose(
  booking: Booking,
  bookings: Booking[],
  slots: DaySlot[],
  unavailable: UnavailablePeriod[],
  date: string,
  time: string,
  nowISO: string,
): Result<Partial<Booking>> {
  if (booking.status !== "Pendiente") {
    return { ok: false, message: "Solo se puede responder una solicitud en estado Pendiente." };
  }
  if (!date || !time) return { ok: false, message: "La fecha y hora propuestas son obligatorias." };
  const startISO = stamp(date, time);
  if (startISO <= nowISO) return { ok: false, message: "La fecha y hora deben ser futuras." };
  const endISO = addMinutesISO(startISO, booking.durationMin);
  const avail = withinAvailability(startISO, endISO, slots, unavailable);
  if (!avail.ok) return { ok: false, message: "El horario propuesto no es válido." };
  return {
    ok: true,
    message: "Contrapropuesta enviada.",
    data: { status: "Sugerida", proposedStartISO: startISO, proposedEndISO: endISO, updatedAt: nowISO },
  };
}

// ---- HU-016 Respuesta del Cliente ----

export function clientAcceptCounter(
  booking: Booking,
  bookings: Booking[],
  slots: DaySlot[],
  unavailable: UnavailablePeriod[],
  nowISO: string,
): Result<Partial<Booking>> {
  if (booking.status !== "Sugerida" || !booking.proposedStartISO || !booking.proposedEndISO) {
    return { ok: false, message: "La solicitud ya no se encuentra en estado Sugerida." };
  }
  const avail = withinAvailability(booking.proposedStartISO, booking.proposedEndISO, slots, unavailable);
  if (!avail.ok) {
    return { ok: false, message: "El horario ya no se encuentra disponible." };
  }
  const clash = findOverlap(
    booking.proposedStartISO,
    booking.proposedEndISO,
    bookings,
    booking.providerId,
    booking.id,
  );
  if (clash) {
    return { ok: false, message: "El horario presenta un conflicto con otra reserva aceptada." };
  }
  return {
    ok: true,
    message: "Reserva confirmada.",
    data: {
      status: "Aceptada",
      startISO: booking.proposedStartISO,
      endISO: booking.proposedEndISO,
      updatedAt: nowISO,
    },
  };
}

// ---- HU-017 Cancelación ----

export function cancelBooking(
  booking: Booking,
  actor: User,
  motivo: string,
  nowISO: string,
): Result<Partial<Booking> & { cancelledBy: Role }> {
  if (motivo.trim().length < 3 || motivo.trim().length > 500) {
    return { ok: false, message: "El motivo es obligatorio (3 a 500 caracteres)." };
  }
  if (booking.status === "Completada") {
    return { ok: false, message: "No se puede cancelar una reserva Completada." };
  }
  if (booking.status === "Cancelada") {
    return { ok: false, message: "La solicitud ya se encuentra Cancelada." };
  }
  if (booking.status === "Rechazada") {
    return { ok: false, message: "La solicitud ya fue Rechazada." };
  }
  const isOwnerClient = actor.role === "Cliente" && actor.id === booking.clientId;
  const isOwnerProvider = actor.role === "Proveedor" && actor.id === booking.providerId;
  if (isOwnerClient && (booking.status === "Pendiente" || booking.status === "Sugerida" || booking.status === "Aceptada")) {
    return {
      ok: true,
      message: "Solicitud cancelada.",
      data: { status: "Cancelada", cancelReason: motivo.trim(), cancelledBy: "Cliente", updatedAt: nowISO },
    };
  }
  if (isOwnerProvider && booking.status === "Aceptada") {
    return {
      ok: true,
      message: "Reserva cancelada.",
      data: { status: "Cancelada", cancelReason: motivo.trim(), cancelledBy: "Proveedor", updatedAt: nowISO },
    };
  }
  return { ok: false, message: "No estás autorizado para cancelar esta solicitud o reserva." };
}

// ---- HU-018 Finalización ----

export function completeBooking(
  booking: Booking,
  actor: User,
  nowISO: string,
): Result<Partial<Booking>> {
  if (actor.role !== "Proveedor" || actor.id !== booking.providerId) {
    return { ok: false, message: "Solo el Proveedor de la reserva puede completarla." };
  }
  if (booking.status !== "Aceptada") {
    return { ok: false, message: "Solo se puede completar una reserva en estado Aceptada." };
  }
  return { ok: true, message: "Reserva marcada como Completada.", data: { status: "Completada", updatedAt: nowISO } };
}

// ---- HU-019 Agenda ----

export function providerAgenda(bookings: Booking[], providerId: string): Booking[] {
  return bookings
    .filter((b) => b.providerId === providerId && b.status === "Aceptada")
    .sort((a, b) => (a.startISO < b.startISO ? -1 : 1));
}

export function clientBookings(bookings: Booking[], clientId: string): Booking[] {
  return bookings
    .filter((b) => b.clientId === clientId)
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export function providerInbox(bookings: Booking[], providerId: string): Booking[] {
  return bookings
    .filter((b) => b.providerId === providerId)
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export function formatDateTime(iso: string): string {
  const [d = "", t = ""] = iso.split("T");
  const [y = "", m = "", day = ""] = d.split("-");
  const [h = 0, min = 0] = t.slice(0, 5).split(":").map(Number);
  const suffix = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${day}/${m}/${y} ${h12}:${String(min).padStart(2, "0")} ${suffix}`;
}

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function dayName(day: number): string {
  return DAY_NAMES[day] ?? "";
}
