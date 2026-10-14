import { describe, expect, it } from "vitest";

import {
  addDaySlot,
  addUnavailablePeriod,
  cancelBooking,
  clientAcceptCounter,
  completeBooking,
  createBooking,
  createService,
  intervalsOverlap,
  isValidEmail,
  loginUser,
  makeUser,
  normalizeEmail,
  passwordIssues,
  providerAccept,
  providerAgenda,
  providerCounterPropose,
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
  verifyRecoveryCode,
  withinAvailability,
  type Booking,
  type User,
} from "@/features/wireframes/domain";

const NOW = Date.now();
const FUTURE = "2027-03-02T10:00:00"; // martes

function users(): User[] {
  return seedUsers();
}

function client(list: User[]): User {
  const u = list.find((u) => u.role === "Cliente");
  if (!u) throw new Error("sin cliente seed");
  return u;
}

function provider(list: User[], id = "p1"): User {
  const u = list.find((u) => u.id === id);
  if (!u) throw new Error("sin proveedor seed");
  return u;
}

function slotsOf(key: string) {
  const s = seedSlots()[key];
  if (!s) throw new Error("sin franjas seed");
  return s;
}

function firstBooking(i: number): Booking {
  const b = seedBookings()[i];
  if (!b) throw new Error("sin reserva seed");
  return b;
}

function serviceFor(providerId = "p1") {
  return seedServices().find((s) => s.providerId === providerId)!;
}

describe("HU-001 registro", () => {
  it("rechaza correo inválido, datos incompletos y rol fuera de Cliente/Proveedor", () => {
    expect(registerUser([], { nombre: "", email: "a@b.co", password: "Cliente123", role: "Cliente" }).ok).toBe(false);
    expect(registerUser([], { nombre: "Ana", email: "mal", password: "Cliente123", role: "Cliente" }).ok).toBe(false);
    expect(registerUser([], { nombre: "Ana", email: "a@b.co", password: "Cliente123", role: "Admin" }).ok).toBe(false);
  });

  it("exige la política de contraseña y normaliza el correo", () => {
    expect(passwordIssues("corta")).toContain("mínimo 8 caracteres");
    expect(passwordIssues("sinmayus123")).toContain("una mayúscula");
    expect(passwordIssues("SinNumero")).toContain("un número");
    expect(normalizeEmail("  ANA@Demo.COM ")).toBe("ana@demo.com");
    const res = registerUser([], { nombre: "Ana", email: "ANA@demo.com", password: "Cliente123", role: "Cliente" });
    expect(res.ok).toBe(true);
  });

  it("crea Cliente y Proveedor y rechaza duplicados", () => {
    let list: User[] = [];
    const c = registerUser(list, { nombre: "Ana", email: "ana@demo.com", password: "Cliente123", role: "Cliente" });
    expect(c.ok).toBe(true);
    if (c.ok) list = [...list, c.data];
    const dup = registerUser(list, { nombre: "Otra", email: "ANA@demo.com", password: "Cliente123", role: "Cliente" });
    expect(dup.ok).toBe(false);
    const p = registerUser(list, { nombre: "María", email: "m@demo.com", password: "Proveedor123", role: "Proveedor" });
    expect(p.ok).toBe(true);
  });
});

describe("HU-002 sesión", () => {
  it("autentica con credenciales válidas e identifica el rol", () => {
    const res = loginUser(users(), "cliente@demo.com", "Cliente123");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.role).toBe("Cliente");
  });

  it("rechaza con mensaje genérico sin revelar la credencial", () => {
    const badPass = loginUser(users(), "cliente@demo.com", "Otra1234");
    const unknown = loginUser(users(), "nadie@demo.com", "Cliente123");
    expect(badPass.ok).toBe(false);
    expect(unknown.ok).toBe(false);
    if (!badPass.ok && !unknown.ok) {
      expect(badPass.message).toBe(unknown.message);
      expect(badPass.message).not.toContain("contraseña");
      expect(badPass.message).not.toContain("correo");
    }
  });

  it("exige correo y contraseña", () => {
    expect(loginUser(users(), "", "Cliente123").ok).toBe(false);
    expect(isValidEmail("x")).toBe(false);
  });
});

describe("HU-003 recuperación", () => {
  it("genera código, lo valida y permite restablecer una sola vez", () => {
    const list = users();
    const step1 = startRecovery(list, [], "cliente@demo.com", NOW);
    expect(step1.demoCode).toMatch(/^\d{6}$/);
    expect(verifyRecoveryCode(step1.recoveries, "cliente@demo.com", step1.demoCode!, NOW).ok).toBe(true);
    const reset = resetPasswordWithCode(list, step1.recoveries, "cliente@demo.com", step1.demoCode!, "Nueva1234", NOW);
    expect(reset.ok).toBe(true);
    if (reset.ok) {
      // Reutilizar el código queda rechazado (un solo uso).
      const reuse = resetPasswordWithCode(reset.data.users, reset.data.recoveries, "cliente@demo.com", step1.demoCode!, "Otra1234", NOW);
      expect(reuse.ok).toBe(false);
      // Y el login funciona con la nueva contraseña.
      expect(loginUser(reset.data.users, "cliente@demo.com", "Nueva1234").ok).toBe(true);
    }
  });

  it("no revela correos inexistentes y rechaza código vencido o erróneo", () => {
    const step = startRecovery(users(), [], "nadie@demo.com", NOW);
    expect(step.demoCode).toBeNull();
    const real = startRecovery(users(), [], "cliente@demo.com", NOW);
    expect(verifyRecoveryCode(real.recoveries, "cliente@demo.com", "000000", NOW).ok).toBe(false);
    expect(verifyRecoveryCode(real.recoveries, "cliente@demo.com", real.demoCode!, NOW + 11 * 60 * 1000).ok).toBe(false);
  });

  it("una nueva solicitud invalida el código anterior", () => {
    const list = users();
    const first = startRecovery(list, [], "cliente@demo.com", NOW);
    const second = startRecovery(list, first.recoveries, "cliente@demo.com", NOW + 1000);
    expect(verifyRecoveryCode(second.recoveries, "cliente@demo.com", first.demoCode!, NOW + 2000).ok).toBe(false);
    expect(verifyRecoveryCode(second.recoveries, "cliente@demo.com", second.demoCode!, NOW + 2000).ok).toBe(true);
  });
});

describe("HU-004 perfil del cliente", () => {
  it("actualiza datos y dirección, y exige obligatorios", () => {
    const me = client(users());
    expect(updateClientProfile(me, { nombre: "", direccion: "X" }).ok).toBe(false);
    expect(updateClientProfile(me, { nombre: "Ana", direccion: "" }).ok).toBe(false);
    const ok = updateClientProfile(me, { nombre: "Ana T.", direccion: "Calle 1" });
    expect(ok.ok).toBe(true);
  });
});

describe("HU-006/007 catálogo", () => {
  it("solo Proveedor registra, con categorías PMV y validaciones", () => {
    const me = client(users());
    expect(createService(me, { nombre: "X", categoria: "Manicure", descripcion: "D", duracionMin: 30, precio: 10000 }).ok).toBe(false);
    const prov = provider(users());
    expect(createService(prov, { nombre: "X", categoria: "Mecánica", descripcion: "D", duracionMin: 30, precio: 10000 }).ok).toBe(false);
    expect(createService(prov, { nombre: "X", categoria: "Masajes", descripcion: "D", duracionMin: 5, precio: 10000 }).ok).toBe(false);
    expect(createService(prov, { nombre: "X", categoria: "Masajes", descripcion: "D", duracionMin: 60, precio: 0 }).ok).toBe(false);
    expect(createService(prov, { nombre: "Masaje demo", categoria: "Masajes", descripcion: "D", duracionMin: 60, precio: 50000 }).ok).toBe(true);
  });

  it("solo el dueño cambia estado y las solicitudes conservan snapshot", () => {
    const list = users();
    const svc = serviceFor("p1");
    const other = provider(list, "p2");
    expect(setServiceState(other, svc, "Inactivo").ok).toBe(false);
    expect(setServiceState(provider(list), svc, "Inactivo").ok).toBe(true);
    const booking = firstBooking(0);
    expect(booking.serviceName).toBe("Manicure a domicilio");
    expect(booking.price).toBe(35000);
  });
});

describe("HU-011 disponibilidad", () => {
  it("valida hora inicial < final y rechaza franjas superpuestas", () => {
    expect(addDaySlot([], { day: 1, start: "18:00", end: "08:00" }).ok).toBe(false);
    const one = addDaySlot([], { day: 1, start: "08:00", end: "12:00" });
    expect(one.ok).toBe(true);
    if (one.ok) {
      expect(addDaySlot([one.data], { day: 1, start: "11:00", end: "13:00" }).ok).toBe(false);
      expect(addDaySlot([one.data], { day: 2, start: "11:00", end: "13:00" }).ok).toBe(true);
    }
  });

  it("valida periodos no disponibles y su uso en solicitudes", () => {
    expect(addUnavailablePeriod([], { start: "2027-03-05", end: "2027-03-01" }).ok).toBe(false);
    const slots = slotsOf("p1");
    // Sábado 2027-03-06 de 10:00 a 10:45 cabe en la franja 09:00–13:00.
    expect(withinAvailability("2027-03-06T10:00:00", "2027-03-06T10:45:00", slots, []).ok).toBe(true);
    // Domingo no hay atención.
    expect(withinAvailability("2027-03-07T10:00:00", "2027-03-07T10:45:00", slots, []).ok).toBe(false);
    // Periodo no disponible bloquea.
    expect(
      withinAvailability("2027-03-06T10:00:00", "2027-03-06T10:45:00", slots, [{ start: "2027-03-06", end: "2027-03-06" }]).ok,
    ).toBe(false);
  });
});

describe("HU-012 creación de solicitud", () => {
  function draft(overrides: Partial<Parameters<typeof createBooking>[0]> = {}) {
    const list = users();
    return {
      client: client(list),
      provider: provider(list),
      service: serviceFor("p1"),
      date: "2027-03-06",
      time: "10:00",
      address: "Cra 10 # 20-30",
      district: "El Prado",
      extraInfo: "",
      notes: "",
      slots: slotsOf("p1"),
      unavailable: [],
      bookings: [] as Booking[],
      nowISO: "2027-01-01T00:00:00",
      ...overrides,
    };
  }

  it("crea en Pendiente con snapshot y fechas, y calcula el fin", () => {
    const res = createBooking(draft());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.status).toBe("Pendiente");
      expect(res.data.serviceName).toBe("Manicure a domicilio");
      expect(res.data.price).toBe(35000);
      expect(res.data.durationMin).toBe(45);
      expect(res.data.endISO).toBe("2027-03-06T10:45:00");
      expect(res.data.createdAt).toBeTruthy();
    }
  });

  it("rechaza servicio inactivo, horario fuera de disponibilidad y datos incompletos", () => {
    const inactive = { ...serviceFor("p1"), estado: "Inactivo" as const };
    expect(createBooking(draft({ service: inactive })).ok).toBe(false);
    expect(createBooking(draft({ time: "20:00" })).ok).toBe(false);
    expect(createBooking(draft({ address: "" })).ok).toBe(false);
    expect(createBooking(draft({ date: "2026-01-01", nowISO: "2027-01-01T00:00:00" })).ok).toBe(false);
  });
});

describe("HU-015 respuesta del proveedor", () => {
  function pending(): Booking {
    return { ...firstBooking(0), startISO: "2027-03-06T10:00:00", endISO: "2027-03-06T10:45:00" };
  }

  it("acepta revalidando disponibilidad y solapamientos", () => {
    const slots = slotsOf("p1");
    expect(providerAccept(pending(), [], slots, [], FUTURE).ok).toBe(true);
    const clash: Booking = { ...pending(), id: "otra", status: "Aceptada" };
    const res = providerAccept(pending(), [clash], slots, [], FUTURE);
    expect(res.ok).toBe(false);
  });

  it("exige motivo para rechazar y valida contrapropuesta", () => {
    const slots = slotsOf("p1");
    expect(providerReject(pending(), "", FUTURE).ok).toBe(false);
    expect(providerReject(pending(), "Sin agenda", FUTURE).ok).toBe(true);
    expect(providerCounterPropose(pending(), [], slots, [], "2027-03-07", "10:00", FUTURE).ok).toBe(false); // domingo
    const ok = providerCounterPropose(pending(), [], slots, [], "2027-03-06", "11:00", FUTURE);
    expect(ok.ok).toBe(true);
  });

  it("solo acepta Pendientes (doble aceptación simulada)", () => {
    const slots = slotsOf("p1");
    const a: Booking = { ...pending(), id: "a" };
    const b: Booking = { ...pending(), id: "b" };
    expect(providerAccept(a, [], slots, [], FUTURE).ok).toBe(true);
    // La segunda, evaluada contra la primera ya aceptada, se bloquea.
    const accepted: Booking = { ...a, status: "Aceptada" };
    expect(providerAccept(b, [accepted], slots, [], FUTURE).ok).toBe(false);
  });
});

describe("HU-016 respuesta del cliente", () => {
  it("acepta la contrapropuesta o la rechaza a Cancelada", () => {
    const slots = slotsOf("p1");
    const sug: Booking = {
      ...firstBooking(1),
      startISO: "2027-03-06T10:00:00",
      endISO: "2027-03-06T10:45:00",
      proposedStartISO: "2027-03-06T11:00:00",
      proposedEndISO: "2027-03-06T11:45:00",
    };
    const ok = clientAcceptCounter(sug, [], slots, [], FUTURE);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data.status).toBe("Aceptada");
      expect(ok.data.startISO).toBe("2027-03-06T11:00:00");
    }
    const clash: Booking = { ...sug, id: "x", status: "Aceptada", startISO: "2027-03-06T11:00:00", endISO: "2027-03-06T11:45:00" };
    expect(clientAcceptCounter(sug, [clash], slots, [], FUTURE).ok).toBe(false);
  });
});

describe("HU-017/018 cancelación y finalización", () => {
  it("aplica reglas de cancelación por rol y estado", () => {
    const list = users();
    const me = client(list);
    const prov = provider(list);
    const pend: Booking = { ...firstBooking(0), clientId: me.id, providerId: prov.id };
    expect(cancelBooking(pend, me, "", FUTURE).ok).toBe(false);
    expect(cancelBooking(pend, me, "Ya no lo necesito", FUTURE).ok).toBe(true);
    const acept: Booking = { ...pend, status: "Aceptada" };
    expect(cancelBooking(acept, prov, "Sin agenda", FUTURE).ok).toBe(true);
    // El proveedor no cancela Pendientes; nadie cancela Completadas ni repetidas.
    expect(cancelBooking(pend, prov, "Motivo válido", FUTURE).ok).toBe(false);
    expect(cancelBooking({ ...pend, status: "Completada" }, me, "Motivo válido", FUTURE).ok).toBe(false);
    expect(cancelBooking({ ...pend, status: "Cancelada" }, me, "Motivo válido", FUTURE).ok).toBe(false);
  });

  it("solo el proveedor dueño completa Aceptadas", () => {
    const list = users();
    const acept: Booking = { ...firstBooking(2), providerId: "p2" };
    expect(completeBooking(acept, provider(list, "p1"), FUTURE).ok).toBe(false);
    expect(completeBooking({ ...acept, status: "Pendiente" }, provider(list, "p2"), FUTURE).ok).toBe(false);
    expect(completeBooking(acept, provider(list, "p2"), FUTURE).ok).toBe(true);
  });

  it("los intervalos se cruzan solo si se solapan", () => {
    expect(intervalsOverlap("2027-03-06T10:00:00", "2027-03-06T11:00:00", "2027-03-06T11:00:00", "2027-03-06T12:00:00")).toBe(false);
    expect(intervalsOverlap("2027-03-06T10:00:00", "2027-03-06T11:00:00", "2027-03-06T10:30:00", "2027-03-06T11:30:00")).toBe(true);
  });
});

describe("HU-019 agenda", () => {
  it("ordena cronológicamente solo Aceptadas del proveedor", () => {
    const agenda = providerAgenda(seedBookings(), "p1");
    expect(agenda.every((b) => b.status === "Aceptada")).toBe(true);
    const sorted = [...agenda].sort((a, b) => (a.startISO < b.startISO ? -1 : 1));
    expect(agenda.map((b) => b.id)).toEqual(sorted.map((b) => b.id));
  });
});
