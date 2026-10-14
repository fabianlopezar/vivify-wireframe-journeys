import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  addDaySlot,
  addServiceMedia,
  addUnavailablePeriod,
  cancelBooking,
  clientAcceptCounter,
  clientBookings,
  completeBooking,
  createBooking,
  createService,
  dayName,
  loginUser,
  makeUser,
  normalizeEmail,
  providerAccept,
  providerAgenda,
  providerCounterPropose,
  providerInbox,
  providerReject,
  registerUser,
  resetPasswordWithCode,
  seedBookings,
  seedServices,
  seedSlots,
  seedUnavailable,
  seedUsers,
  setServiceState,
  startRecovery,
  updateClientProfile,
  updateProviderProfile,
  validateRegistration,
  verifyRecoveryCode,
  type Booking,
  type DaySlot,
  type Recovery,
  type Result,
  type Role,
  type Service,
  type ServiceState,
  type Session,
  type UnavailablePeriod,
  type User,
} from "./domain";

export interface AuthForm {
  nombre: string;
  email: string;
  password: string;
  role: Role;
}

interface StoreValue {
  users: User[];
  session: Session | null;
  currentUser: User | undefined;
  services: Service[];
  slots: Record<string, DaySlot[]>;
  unavailable: Record<string, UnavailablePeriod[]>;
  bookings: Booking[];
  recoveries: Recovery[];
  demoMailbox: string | null;
  message: string | null;
  activeBookingId: string | null;
  setMessage: (m: string | null) => void;
  setActiveBookingId: (id: string | null) => void;
  nowISO: () => string;
  register: (form: AuthForm) => boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  requestRecovery: (email: string) => void;
  checkRecoveryCode: (email: string, code: string) => boolean;
  resetPassword: (email: string, code: string, next: string) => boolean;
  saveClientProfile: (nombre: string, direccion: string) => boolean;
  saveProviderProfile: (presentacion: string, zonas: string) => boolean;
  addService: (input: { nombre: string; categoria: string; descripcion: string; duracionMin: number; precio: number }) => boolean;
  toggleService: (serviceId: string, estado: ServiceState) => boolean;
  addMedia: (serviceId: string, kind: "foto" | "video", ref: string) => boolean;
  saveInsumos: (serviceId: string, insumos: string) => boolean;
  addSlot: (day: number, start: string, end: string) => boolean;
  addUnavailability: (start: string, end: string) => boolean;
  placeBooking: (input: {
    providerId: string;
    serviceId: string;
    date: string;
    time: string;
    address: string;
    district: string;
    extraInfo: string;
    notes: string;
  }) => boolean;
  acceptBooking: (bookingId: string) => boolean;
  rejectBooking: (bookingId: string, motivo: string) => boolean;
  counterBooking: (bookingId: string, date: string, time: string) => boolean;
  acceptCounter: (bookingId: string) => boolean;
  rejectCounter: (bookingId: string) => boolean;
  cancel: (bookingId: string, motivo: string) => boolean;
  complete: (bookingId: string) => boolean;
  myBookings: () => Booking[];
  inbox: () => Booking[];
  agenda: () => Booking[];
  providerName: (id: string) => string;
  serviceById: (id: string) => Service | undefined;
  userById: (id: string) => User | undefined;
  slotSummary: (providerId: string) => string;
}

const StoreContext = createContext<StoreValue | null>(null);

function uid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 9999)}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(seedUsers);
  const [session, setSession] = useState<Session | null>(null);
  const [services, setServices] = useState<Service[]>(seedServices);
  const [slots, setSlots] = useState<Record<string, DaySlot[]>>(seedSlots);
  const [unavailable, setUnavailable] = useState<Record<string, UnavailablePeriod[]>>(seedUnavailable);
  const [bookings, setBookings] = useState<Booking[]>(seedBookings);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [demoMailbox, setDemoMailbox] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  const nowISO = useCallback(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
  }, []);

  const currentUser = useMemo(() => {
    if (!session) return undefined;
    if (Date.now() > session.expiresAt) return undefined;
    return users.find((u) => u.id === session.userId);
  }, [session, users]);

  const fail = useCallback((m: string) => {
    setMessage(m);
    return false;
  }, []);

  const register = useCallback(
    (form: AuthForm) => {
      const valid = validateRegistration(form);
      if (!valid.ok) return fail(valid.message);
      const res = registerUser(users, form);
      if (!res.ok) return fail(res.message);
      setUsers((prev) => [...prev, (res as { data: User }).data]);
      setMessage("Cuenta creada. Ahora inicia sesión.");
      return true;
    },
    [users, fail],
  );

  const login = useCallback(
    (email: string, password: string) => {
      const res = loginUser(users, email, password);
      if (!res.ok) return fail(res.message);
      const user = (res as { data: User }).data;
      setSession({ userId: user.id, token: `demo-${uid("")}`, expiresAt: Date.now() + 60 * 60 * 1000 });
      setMessage(`Sesión iniciada como ${user.role}.`);
      return true;
    },
    [users, fail],
  );

  const logout = useCallback(() => {
    setSession(null);
    setActiveBookingId(null);
    setMessage("Sesión cerrada.");
  }, []);

  const requestRecovery = useCallback(
    (email: string) => {
      // Respuesta neutra: no revela si el correo existe (HU-003 CA-2).
      const { recoveries: next, demoCode } = startRecovery(users, recoveries, email, Date.now());
      setRecoveries(next);
      setDemoMailbox(
        demoCode ? `Correo simulado para ${normalizeEmail(email)}: tu código es ${demoCode} (vigente 10 min).` : null,
      );
      setMessage("Si el correo está registrado, enviamos un código de recuperación.");
    },
    [users, recoveries],
  );

  const checkRecoveryCode = useCallback(
    (email: string, code: string) => {
      const res = verifyRecoveryCode(recoveries, email, code, Date.now());
      setMessage(res.message);
      return res.ok;
    },
    [recoveries],
  );

  const resetPassword = useCallback(
    (email: string, code: string, next: string) => {
      const res = resetPasswordWithCode(users, recoveries, email, code, next, Date.now());
      if (!res.ok) {
        if (res.message === "El código no es válido.") {
          setRecoveries((prev) =>
            prev.map((r) =>
              r.email === normalizeEmail(email) && !r.used ? { ...r, attempts: r.attempts + 1 } : r,
            ),
          );
        }
        return fail(res.message);
      }
      const data = (res as { data: { users: User[]; recoveries: Recovery[] } }).data;
      setUsers(data.users);
      setRecoveries(data.recoveries);
      setDemoMailbox(null);
      setMessage(res.message);
      return true;
    },
    [users, recoveries, fail],
  );

  const saveClientProfile = useCallback(
    (nombre: string, direccion: string) => {
      if (!currentUser) return fail("Debes iniciar sesión.");
      const res = updateClientProfile(currentUser, { nombre, direccion });
      if (!res.ok) return fail(res.message);
      const data = (res as { data: Partial<User> }).data;
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, ...data } : u)));
      setMessage(res.message);
      return true;
    },
    [currentUser, fail],
  );

  const saveProviderProfile = useCallback(
    (presentacion: string, zonas: string) => {
      if (!currentUser) return fail("Debes iniciar sesión.");
      const list = zonas.split(",").map((z) => z.trim()).filter(Boolean);
      const res = updateProviderProfile(currentUser, { presentacion, zonas: list });
      if (!res.ok) return fail(res.message);
      const data = (res as { data: Partial<User> }).data;
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, ...data } : u)));
      setMessage(res.message);
      return true;
    },
    [currentUser, fail],
  );

  const addService = useCallback(
    (input: { nombre: string; categoria: string; descripcion: string; duracionMin: number; precio: number }) => {
      if (!currentUser) return fail("Debes iniciar sesión.");
      const res = createService(currentUser, input);
      if (!res.ok) return fail(res.message);
      setServices((prev) => [...prev, (res as { data: Service }).data]);
      setMessage(res.message);
      return true;
    },
    [currentUser, fail],
  );

  const toggleService = useCallback(
    (serviceId: string, estado: ServiceState) => {
      if (!currentUser) return fail("Debes iniciar sesión.");
      const svc = services.find((s) => s.id === serviceId);
      if (!svc) return fail("El servicio no fue encontrado.");
      const res = setServiceState(currentUser, svc, estado);
      if (!res.ok) return fail(res.message);
      setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, estado } : s)));
      setMessage(res.message);
      return true;
    },
    [currentUser, services, fail],
  );

  const addMedia = useCallback(
    (serviceId: string, kind: "foto" | "video", ref: string) => {
      if (!currentUser) return fail("Debes iniciar sesión.");
      const svc = services.find((s) => s.id === serviceId);
      if (!svc) return fail("El servicio no fue encontrado.");
      const res = addServiceMedia(currentUser, svc, kind, ref);
      if (!res.ok) return fail(res.message);
      const list = (res as { data: string[] }).data;
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, [kind === "foto" ? "fotos" : "videos"]: list } : s)),
      );
      setMessage(res.message);
      return true;
    },
    [currentUser, services, fail],
  );

  const saveInsumos = useCallback(
    (serviceId: string, insumos: string) => {
      if (!currentUser) return fail("Debes iniciar sesión.");
      const svc = services.find((s) => s.id === serviceId);
      if (!svc) return fail("El servicio no fue encontrado.");
      if (currentUser.role !== "Proveedor" || svc.providerId !== currentUser.id) {
        return fail("No puedes modificar un servicio que no es de tu catálogo.");
      }
      setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, insumos } : s)));
      setMessage("Insumos y equipos registrados.");
      return true;
    },
    [currentUser, services, fail],
  );

  const addSlot = useCallback(
    (day: number, start: string, end: string) => {
      if (!currentUser || currentUser.role !== "Proveedor") return fail("Solo un Proveedor puede configurar disponibilidad.");
      const res = addDaySlot(slots[currentUser.id] ?? [], { day, start, end });
      if (!res.ok) return fail(res.message);
      setSlots((prev) => ({ ...prev, [currentUser.id]: [...(prev[currentUser.id] ?? []), res.data as DaySlot] }));
      setMessage(res.message);
      return true;
    },
    [currentUser, slots, fail],
  );

  const addUnavailability = useCallback(
    (start: string, end: string) => {
      if (!currentUser || currentUser.role !== "Proveedor") return fail("Solo un Proveedor puede configurar disponibilidad.");
      const res = addUnavailablePeriod(unavailable[currentUser.id] ?? [], { start, end });
      if (!res.ok) return fail(res.message);
      setUnavailable((prev) => ({ ...prev, [currentUser.id]: [...(prev[currentUser.id] ?? []), res.data as UnavailablePeriod] }));
      setMessage(res.message);
      return true;
    },
    [currentUser, unavailable, fail],
  );

  const placeBooking = useCallback(
    (input: { providerId: string; serviceId: string; date: string; time: string; address: string; district: string; extraInfo: string; notes: string }) => {
      if (!currentUser) return fail("Debes iniciar sesión como Cliente.");
      const provider = users.find((u) => u.id === input.providerId);
      const service = services.find((s) => s.id === input.serviceId);
      if (!provider || !service) return fail("El Proveedor o servicio no fue encontrado.");
      const res = createBooking({
        client: currentUser,
        provider,
        service,
        date: input.date,
        time: input.time,
        address: input.address,
        district: input.district,
        extraInfo: input.extraInfo,
        notes: input.notes,
        slots: slots[provider.id] ?? [],
        unavailable: unavailable[provider.id] ?? [],
        bookings,
        nowISO: nowISO(),
      });
      if (!res.ok) return fail(res.message);
      const booking = (res as { data: Booking }).data;
      setBookings((prev) => [...prev, booking]);
      setActiveBookingId(booking.id);
      setMessage(res.message);
      return true;
    },
    [currentUser, users, services, slots, unavailable, bookings, nowISO, fail],
  );

  // Aceptar es atómico: la revalidación y el cambio de estado ocurren en la
  // misma actualización funcional (comparar-e-intercambiar). Si dos
  // aceptaciones concurrentes compiten, solo la primera confirma.
  const acceptBooking = useCallback(
    (bookingId: string) => {
      if (!currentUser) return fail("Debes iniciar sesión.");
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return fail("La solicitud no fue encontrada.");
      if (booking.providerId !== currentUser.id) return fail("La solicitud está dirigida a otro Proveedor.");
      const res = providerAccept(booking, bookings, slots[booking.providerId] ?? [], unavailable[booking.providerId] ?? [], nowISO());
      if (!res.ok) return fail(res.message);
      const patch = (res as { data: Partial<Booking> }).data;
      setBookings((prev) => {
        const current = prev.find((b) => b.id === bookingId);
        if (!current || current.status !== "Pendiente") return prev;
        const clash = prev.some(
          (b) =>
            b.id !== bookingId &&
            b.providerId === current.providerId &&
            b.status === "Aceptada" &&
            current.startISO < b.endISO &&
            b.startISO < current.endISO,
        );
        if (clash) return prev;
        return prev.map((b) => (b.id === bookingId ? { ...b, ...patch } : b));
      });
      const still = bookings.find((b) => b.id === bookingId);
      void still;
      setMessage(res.message);
      return true;
    },
    [currentUser, bookings, slots, unavailable, nowISO, fail],
  );

  const rejectBooking = useCallback(
    (bookingId: string, motivo: string) => {
      if (!currentUser) return fail("Debes iniciar sesión.");
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return fail("La solicitud no fue encontrada.");
      if (booking.providerId !== currentUser.id) return fail("La solicitud está dirigida a otro Proveedor.");
      const res = providerReject(booking, motivo, nowISO());
      if (!res.ok) return fail(res.message);
      const patch = (res as { data: Partial<Booking> }).data;
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId && b.status === "Pendiente" ? { ...b, ...patch } : b)),
      );
      setMessage(res.message);
      return true;
    },
    [currentUser, bookings, nowISO, fail],
  );

  const counterBooking = useCallback(
    (bookingId: string, date: string, time: string) => {
      if (!currentUser) return fail("Debes iniciar sesión.");
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return fail("La solicitud no fue encontrada.");
      if (booking.providerId !== currentUser.id) return fail("La solicitud está dirigida a otro Proveedor.");
      const res = providerCounterPropose(booking, bookings, slots[booking.providerId] ?? [], unavailable[booking.providerId] ?? [], date, time, nowISO());
      if (!res.ok) return fail(res.message);
      const patch = (res as { data: Partial<Booking> }).data;
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId && b.status === "Pendiente" ? { ...b, ...patch } : b)),
      );
      setMessage(res.message);
      return true;
    },
    [currentUser, bookings, slots, unavailable, nowISO, fail],
  );

  const acceptCounter = useCallback(
    (bookingId: string) => {
      if (!currentUser) return fail("Debes iniciar sesión.");
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return fail("La solicitud no fue encontrada.");
      if (booking.clientId !== currentUser.id) return fail("La solicitud pertenece a otro Cliente.");
      const res = clientAcceptCounter(booking, bookings, slots[booking.providerId] ?? [], unavailable[booking.providerId] ?? [], nowISO());
      if (!res.ok) return fail(res.message);
      const patch = (res as { data: Partial<Booking> }).data;
      setBookings((prev) => {
        const current = prev.find((b) => b.id === bookingId);
        if (!current || current.status !== "Sugerida" || !current.proposedStartISO || !current.proposedEndISO) return prev;
        const clash = prev.some(
          (b) =>
            b.id !== bookingId &&
            b.providerId === current.providerId &&
            b.status === "Aceptada" &&
            current.proposedStartISO! < b.endISO &&
            b.startISO < current.proposedEndISO!,
        );
        if (clash) return prev;
        return prev.map((b) => (b.id === bookingId ? { ...b, ...patch } : b));
      });
      setMessage(res.message);
      return true;
    },
    [currentUser, bookings, slots, unavailable, nowISO, fail],
  );

  const rejectCounter = useCallback(
    (bookingId: string) => {
      if (!currentUser) return fail("Debes iniciar sesión.");
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return fail("La solicitud no fue encontrada.");
      if (booking.clientId !== currentUser.id) return fail("La solicitud pertenece a otro Cliente.");
      if (booking.status !== "Sugerida") return fail("La solicitud ya no se encuentra en estado Sugerida.");
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "Cancelada", updatedAt: nowISO() } : b)),
      );
      setMessage("Contrapropuesta rechazada. La solicitud quedó Cancelada.");
      return true;
    },
    [currentUser, bookings, nowISO, fail],
  );

  const cancel = useCallback(
    (bookingId: string, motivo: string) => {
      if (!currentUser) return fail("Debes iniciar sesión.");
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return fail("La solicitud no fue encontrada.");
      const res = cancelBooking(booking, currentUser, motivo, nowISO());
      if (!res.ok) return fail(res.message);
      const patch = (res as { data: Partial<Booking> }).data;
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, ...patch } : b)));
      setMessage(res.message);
      return true;
    },
    [currentUser, bookings, nowISO, fail],
  );

  const complete = useCallback(
    (bookingId: string) => {
      if (!currentUser) return fail("Debes iniciar sesión.");
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return fail("La reserva no fue encontrada.");
      const res = completeBooking(booking, currentUser, nowISO());
      if (!res.ok) return fail(res.message);
      const patch = (res as { data: Partial<Booking> }).data;
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, ...patch } : b)));
      setMessage(res.message);
      return true;
    },
    [currentUser, bookings, nowISO, fail],
  );

  const value: StoreValue = {
    users,
    session,
    currentUser,
    services,
    slots,
    unavailable,
    bookings,
    recoveries,
    demoMailbox,
    message,
    activeBookingId,
    setMessage,
    setActiveBookingId,
    nowISO,
    register,
    login,
    logout,
    requestRecovery,
    checkRecoveryCode,
    resetPassword,
    saveClientProfile,
    saveProviderProfile,
    addService,
    toggleService,
    addMedia,
    saveInsumos,
    addSlot,
    addUnavailability,
    placeBooking,
    acceptBooking,
    rejectBooking,
    counterBooking,
    acceptCounter,
    rejectCounter,
    cancel,
    complete,
    myBookings: () => (currentUser ? clientBookings(bookings, currentUser.id) : []),
    inbox: () => (currentUser ? providerInbox(bookings, currentUser.id) : []),
    agenda: () => (currentUser ? providerAgenda(bookings, currentUser.id) : []),
    providerName: (id) => users.find((u) => u.id === id)?.nombre ?? "Proveedor no encontrado",
    serviceById: (id) => services.find((s) => s.id === id),
    userById: (id) => users.find((u) => u.id === id),
    slotSummary: (providerId) =>
      (slots[providerId] ?? [])
        .map((s) => `${dayName(s.day)} ${s.start}–${s.end}`)
        .join(", ") || "Sin disponibilidad registrada",
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}

export { makeUser };
