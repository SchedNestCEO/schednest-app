"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type SchedNestLanguage = "en" | "es";

type LanguageContextValue = {
  language: SchedNestLanguage;
  setLanguage: (language: SchedNestLanguage) => void;
  t: (key: string, fallback?: string) => string;
};

const STORAGE_KEY = "schednest-language";

const dictionaries: Record<SchedNestLanguage, Record<string, string>> = {
  en: {
    "common.login": "Log in",
    "common.logout": "Log out",
    "common.getStarted": "Get started",
    "common.start": "Start",
    "common.close": "Close",
    "common.privacy": "Privacy",
    "common.terms": "Terms",
    "common.security": "Security",
    "common.contact": "Contact",
    "common.language": "Language",
    "common.english": "English",
    "common.spanish": "Spanish",
    "common.signedInAs": "Signed in as",
    "common.complete": "complete",
    "common.admin": "admin",
    "common.beta": "beta",
    "common.menu": "Menu",
    "common.loading": "Loading...",

    "brand.tagline": "From first client to full company",
    "brand.founder": "SchedNest Founder",

    "nav.dashboard": "Dashboard",
    "nav.profile": "Profile",
    "nav.bookings": "Bookings",
    "nav.requests": "Requests",
    "nav.customers": "Customers",
    "nav.services": "Services",
    "nav.bookingPage": "Booking Page",
    "nav.settings": "Settings",
    "nav.birdy": "Birdy",
    "nav.subscriptions": "Subscriptions",

    "home.badge": "Start simple. Stay organized. Grow with SchedNest.",
    "home.heroTitle": "Organize your bookings from first client to full company.",
    "home.heroDescription":
      "Give customers one simple way to request appointments, keep every booking organized, and manage your growing service business from one place.",
    "home.primaryCta": "Start your business dashboard",
    "home.audience":
      "Built for mobile service providers, solo operators, and growing teams who need more structure.",
    "home.today": "Today",
    "home.bookingActivity": "Booking activity",
    "home.live": "Live",
    "home.newRequest": "New request received",
    "home.customerWaiting": "Customer is waiting for approval.",
    "home.appointmentApproved": "Appointment approved",
    "home.confirmationReady": "Customer confirmation is ready.",
    "home.customerSaved": "Customer saved",
    "home.clientListGrows": "Your client list grows automatically.",
    "home.requests": "Requests",
    "home.customers": "Customers",
    "home.services": "Services",
    "home.mission": "Mission",
    "home.missionText":
      "SchedNest helps service providers organize, book, and grow — from their first client to a full-fledged company.",
    "home.why": "Why SchedNest",
    "home.hustleToStructure": "Move from hustle to structure.",
    "home.whyDescription":
      "SchedNest is built for service providers who are ready to stop managing everything through memory, texts, screenshots, and scattered notes.",
    "home.pricing": "Founder Beta Pricing",
    "home.pricingTitle": "Available for the first 25 paid businesses that join.",
    "home.pricingDescription":
      "Lock in early pricing for the life of your active subscription. Founder Beta pricing is limited to the first 25 eligible businesses that become paid subscribers before full launch.",
    "home.vision": "Vision",
    "home.visionTitle": "The business operating system for service providers.",
    "home.visionDescription":
      "To become the business operating system that helps service providers everywhere move from hustle to structure, from scattered bookings to organized growth, and from first client to full company.",
    "home.finalTitle":
      "Start simple today. Build the system your business will grow into.",
    "home.rights": "All rights reserved.",

    "dashboard.commandCenter": "Command Center",
    "dashboard.checking": "Checking your Nest...",
    "dashboard.requestsWaiting": "You have requests waiting.",
    "dashboard.finishSetup": "Finish your setup.",
    "dashboard.nestReady": "Your Nest is ready.",
    "dashboard.loadingDescription":
      "Loading your bookings, setup status, requests, and customer activity.",
    "dashboard.reviewRequestsDescription":
      "Start by reviewing customer booking requests so no opportunity sits unanswered.",
    "dashboard.readyDescription":
      "Manage bookings, customers, services, and booking growth from one focused dashboard.",
    "dashboard.copyBookingLink": "Copy booking link",
    "dashboard.bookingLinkCopied": "Booking link copied.",
    "dashboard.createSlugFirst": "Create your booking page slug first.",
    "dashboard.viewBookingPage": "View booking page",
    "dashboard.openSettings": "Open settings",
    "dashboard.openSetupGuide": "Open setup guide",
    "dashboard.setupGuide": "Setup Guide",
    "dashboard.setupGuideTitle": "Let’s set up your business.",
    "dashboard.setupGuideDescription":
      "Follow these steps in order so your booking page is ready for real customers. SchedNest will highlight the next thing that needs your attention.",
    "dashboard.setupProgress": "Setup progress",
    "dashboard.stepsComplete": "steps complete.",
    "dashboard.continue": "Continue",
    "dashboard.dontShowAgain": "Don’t show again",
    "dashboard.startHere": "Start here",
    "dashboard.upcoming": "Upcoming",
    "dashboard.done": "Done",
    "dashboard.setupProgressPanel": "Setup Progress",
    "dashboard.manage": "Manage",
    "dashboard.subscription": "Subscription",
    "dashboard.manageAccount": "Manage account →",
    "dashboard.todaysBookings": "Today's Bookings",
    "dashboard.pendingRequests": "Pending Requests",
    "dashboard.activeServices": "Active Services",
    "dashboard.quickLaunch": "Quick Launch",
    "dashboard.manageBookings": "Manage bookings",
    "dashboard.reviewPending": "Review pending",
    "dashboard.updateMenu": "Update menu",
    "dashboard.publicPage": "Public Page",
    "dashboard.previewBooking": "Preview booking",
    "dashboard.needsAttention": "Needs Attention",
    "dashboard.whatNeedsAction": "What needs action?",
    "dashboard.refresh": "Refresh",
    "dashboard.refreshing": "Refreshing...",
    "dashboard.nestCalm": "Your Nest is calm.",
    "dashboard.setupChecklist": "Setup Checklist",
    "dashboard.buildBookingSystem": "Build your booking system",
    "dashboard.birdySuggestions": "Birdy Smart Suggestions",
    "dashboard.birdyTitle": "What Birdy recommends next",
    "dashboard.openBirdy": "Open Birdy",

    "setup.profile.title": "Create your business profile",
    "setup.profile.description": "Add your business name and basic booking identity.",
    "setup.profile.action": "Edit profile",
    "setup.services.title": "Add your services",
    "setup.services.description": "Create the services customers can request.",
    "setup.services.action": "Manage services",
    "setup.activeServices.title": "Activate at least one service",
    "setup.activeServices.description":
      "Make sure at least one service is active and bookable.",
    "setup.activeServices.action": "Activate services",
    "setup.hours.title": "Set your working hours",
    "setup.hours.description": "Tell customers when your business is available.",
    "setup.hours.action": "Set hours",
    "setup.link.title": "Create your public booking link",
    "setup.link.description":
      "Your booking page needs a public slug before sharing.",
    "setup.link.action": "Open booking page",
    "deposit.title": "Deposits & business policy",
    "deposit.shortTitle": "Deposit",
    "deposit.required": "Deposit required",
    "deposit.notRequired": "No deposit required",
    "deposit.requireToggle": "Require a deposit",
    "deposit.collectionMethod": "Collection method",
    "deposit.manual": "Manual payment",
    "deposit.stripe": "Stripe checkout",
    "deposit.stripeComingSoon": "Stripe checkout is coming soon. Manual deposits work now.",
    "deposit.type": "Deposit type",
    "deposit.none": "None",
    "deposit.fixed": "Fixed amount",
    "deposit.percent": "Percent of service price",
    "deposit.amount": "Deposit amount",
    "deposit.amountPlaceholder": "Example: 25",
    "deposit.policy": "Custom deposit policy",
    "deposit.policyHelper": "Write the deposit rules your customers must agree to before requesting this service. This policy is created by your business, not SchedNest.",
    "deposit.policyPlaceholder": "Example: A $25 deposit is required to secure your appointment. Deposits go toward your final balance and are non-refundable for same-day cancellations.",
    "deposit.instructions": "Manual payment instructions",
    "deposit.instructionsHelper": "Tell customers where to send the deposit, such as Zelle, Cash App, Venmo, PayPal, or bank transfer.",
    "deposit.instructionsPlaceholder": "Example: Send deposit to Zelle: business@email.com or Cash App: $BusinessName.",
    "deposit.customerAgreement": "I have read and agree to this business's deposit policy.",
    "deposit.customerMustAgree": "Please agree to the business deposit policy before sending your request.",
    "deposit.businessPolicy": "Business-written deposit policy",
    "deposit.manualInstructions": "Manual deposit instructions",
    "deposit.manualNotice": "SchedNest cannot verify manual payments automatically. The business must mark the deposit as received.",
    "deposit.markPaid": "Mark deposit paid",
    "deposit.waive": "Waive deposit",
    "deposit.paid": "Deposit paid",
    "deposit.waived": "Deposit waived",
    "deposit.pending": "Deposit pending",
    "deposit.requiredStatus": "Required",
    "deposit.notRequiredStatus": "Not required",
    "deposit.accepted": "Policy accepted",
    "deposit.notAccepted": "Policy not accepted",
    "deposit.saved": "Deposit settings saved.",
    "deposit.paidMessage": "Deposit marked as paid.",
    "deposit.waivedMessage": "Deposit waived.",
    "manualPayments.title": "Manual payment methods",
    "manualPayments.description": "Add the payment usernames, links, or QR code customers should use when a manual deposit is required.",
    "manualPayments.enabled": "Show manual payment methods on booking page",
    "manualPayments.zelle": "Zelle",
    "manualPayments.cashApp": "Cash App",
    "manualPayments.venmo": "Venmo",
    "manualPayments.paypal": "PayPal",
    "manualPayments.other": "Other payment instructions",
    "manualPayments.qrCode": "Payment QR code",
    "manualPayments.qrCaption": "QR code caption",
    "manualPayments.uploadQr": "Upload QR code",
    "manualPayments.removeQr": "Remove QR code",
    "manualPayments.save": "Save payment methods",
    "manualPayments.saving": "Saving payment methods...",
    "manualPayments.saved": "Manual payment methods saved.",
    "manualPayments.uploaded": "Payment QR code uploaded.",
    "manualPayments.publicTitle": "Ways to send your manual deposit",
    "manualPayments.publicDescription": "Use one of the payment methods below, then the business will mark your deposit as received.",
    "manualPayments.noMethods": "No manual payment methods have been added yet.",
  },

  es: {
    "common.login": "Iniciar sesión",
    "common.logout": "Cerrar sesión",
    "common.getStarted": "Comenzar",
    "common.start": "Empezar",
    "common.close": "Cerrar",
    "common.privacy": "Privacidad",
    "common.terms": "Términos",
    "common.security": "Seguridad",
    "common.contact": "Contacto",
    "common.language": "Idioma",
    "common.english": "Inglés",
    "common.spanish": "Español",
    "common.signedInAs": "Sesión iniciada como",
    "common.complete": "completo",
    "common.admin": "admin",
    "common.beta": "beta",
    "common.menu": "Menú",
    "common.loading": "Cargando...",

    "brand.tagline": "Desde tu primer cliente hasta una empresa completa",
    "brand.founder": "Fundador de SchedNest",

    "nav.dashboard": "Panel",
    "nav.profile": "Perfil",
    "nav.bookings": "Reservas",
    "nav.requests": "Solicitudes",
    "nav.customers": "Clientes",
    "nav.services": "Servicios",
    "nav.bookingPage": "Página de reservas",
    "nav.settings": "Configuración",
    "nav.birdy": "Birdy",
    "nav.subscriptions": "Suscripciones",

    "home.badge": "Empieza simple. Mantente organizado. Crece con SchedNest.",
    "home.heroTitle":
      "Organiza tus reservas desde tu primer cliente hasta una empresa completa.",
    "home.heroDescription":
      "Dale a tus clientes una forma simple de solicitar citas, mantén cada reserva organizada y administra tu negocio de servicios desde un solo lugar.",
    "home.primaryCta": "Crear mi panel de negocio",
    "home.audience":
      "Creado para proveedores móviles, trabajadores independientes y equipos en crecimiento que necesitan más estructura.",
    "home.today": "Hoy",
    "home.bookingActivity": "Actividad de reservas",
    "home.live": "En vivo",
    "home.newRequest": "Nueva solicitud recibida",
    "home.customerWaiting": "El cliente espera aprobación.",
    "home.appointmentApproved": "Cita aprobada",
    "home.confirmationReady": "La confirmación del cliente está lista.",
    "home.customerSaved": "Cliente guardado",
    "home.clientListGrows": "Tu lista de clientes crece automáticamente.",
    "home.requests": "Solicitudes",
    "home.customers": "Clientes",
    "home.services": "Servicios",
    "home.mission": "Misión",
    "home.missionText":
      "SchedNest ayuda a proveedores de servicios a organizar, reservar y crecer — desde su primer cliente hasta una empresa completa.",
    "home.why": "Por qué SchedNest",
    "home.hustleToStructure": "Pasa del desorden a la estructura.",
    "home.whyDescription":
      "SchedNest está creado para proveedores de servicios que quieren dejar de manejar todo con memoria, textos, capturas y notas dispersas.",
    "home.pricing": "Precios Founder Beta",
    "home.pricingTitle": "Disponible para los primeros 25 negocios pagos que se unan.",
    "home.pricingDescription":
      "Asegura precio temprano mientras tu suscripción se mantenga activa. Founder Beta está limitado a los primeros 25 negocios elegibles antes del lanzamiento completo.",
    "home.vision": "Visión",
    "home.visionTitle": "El sistema operativo para negocios de servicios.",
    "home.visionDescription":
      "Convertirse en el sistema operativo que ayuda a proveedores de servicios en todas partes a pasar del desorden a la estructura, de reservas dispersas a crecimiento organizado, y de primer cliente a empresa completa.",
    "home.finalTitle":
      "Empieza simple hoy. Construye el sistema que tu negocio necesita para crecer.",
    "home.rights": "Todos los derechos reservados.",

    "dashboard.commandCenter": "Centro de control",
    "dashboard.checking": "Revisando tu Nest...",
    "dashboard.requestsWaiting": "Tienes solicitudes pendientes.",
    "dashboard.finishSetup": "Termina tu configuración.",
    "dashboard.nestReady": "Tu Nest está listo.",
    "dashboard.loadingDescription":
      "Cargando tus reservas, configuración, solicitudes y actividad de clientes.",
    "dashboard.reviewRequestsDescription":
      "Empieza revisando las solicitudes de clientes para que ninguna oportunidad quede sin responder.",
    "dashboard.readyDescription":
      "Administra reservas, clientes, servicios y crecimiento desde un panel enfocado.",
    "dashboard.copyBookingLink": "Copiar enlace de reservas",
    "dashboard.bookingLinkCopied": "Enlace de reservas copiado.",
    "dashboard.createSlugFirst": "Primero crea el enlace público de tu página.",
    "dashboard.viewBookingPage": "Ver página de reservas",
    "dashboard.openSettings": "Abrir configuración",
    "dashboard.openSetupGuide": "Abrir guía de configuración",
    "dashboard.setupGuide": "Guía de configuración",
    "dashboard.setupGuideTitle": "Configuremos tu negocio.",
    "dashboard.setupGuideDescription":
      "Sigue estos pasos en orden para que tu página de reservas esté lista para clientes reales. SchedNest resaltará lo siguiente que necesita tu atención.",
    "dashboard.setupProgress": "Progreso de configuración",
    "dashboard.stepsComplete": "pasos completos.",
    "dashboard.continue": "Continuar",
    "dashboard.dontShowAgain": "No mostrar de nuevo",
    "dashboard.startHere": "Empieza aquí",
    "dashboard.upcoming": "Próximamente",
    "dashboard.done": "Listo",
    "dashboard.setupProgressPanel": "Progreso de configuración",
    "dashboard.manage": "Administrar",
    "dashboard.subscription": "Suscripción",
    "dashboard.manageAccount": "Administrar cuenta →",
    "dashboard.todaysBookings": "Reservas de hoy",
    "dashboard.pendingRequests": "Solicitudes pendientes",
    "dashboard.activeServices": "Servicios activos",
    "dashboard.quickLaunch": "Accesos rápidos",
    "dashboard.manageBookings": "Administrar reservas",
    "dashboard.reviewPending": "Revisar pendientes",
    "dashboard.updateMenu": "Actualizar menú",
    "dashboard.publicPage": "Página pública",
    "dashboard.previewBooking": "Vista previa",
    "dashboard.needsAttention": "Necesita atención",
    "dashboard.whatNeedsAction": "¿Qué necesita acción?",
    "dashboard.refresh": "Actualizar",
    "dashboard.refreshing": "Actualizando...",
    "dashboard.nestCalm": "Tu Nest está tranquilo.",
    "dashboard.setupChecklist": "Lista de configuración",
    "dashboard.buildBookingSystem": "Construye tu sistema de reservas",
    "dashboard.birdySuggestions": "Sugerencias inteligentes de Birdy",
    "dashboard.birdyTitle": "Lo que Birdy recomienda después",
    "dashboard.openBirdy": "Abrir Birdy",

    "setup.profile.title": "Crea tu perfil de negocio",
    "setup.profile.description":
      "Agrega el nombre de tu negocio y la identidad básica de reservas.",
    "setup.profile.action": "Editar perfil",
    "setup.services.title": "Agrega tus servicios",
    "setup.services.description":
      "Crea los servicios que los clientes pueden solicitar.",
    "setup.services.action": "Administrar servicios",
    "setup.activeServices.title": "Activa al menos un servicio",
    "setup.activeServices.description":
      "Asegúrate de que al menos un servicio esté activo y disponible para reservar.",
    "setup.activeServices.action": "Activar servicios",
    "setup.hours.title": "Configura tus horarios",
    "setup.hours.description":
      "Dile a los clientes cuándo está disponible tu negocio.",
    "setup.hours.action": "Configurar horarios",
    "setup.link.title": "Crea tu enlace público de reservas",
    "setup.link.description":
      "Tu página de reservas necesita un enlace público antes de compartirla.",
    "setup.link.action": "Abrir página de reservas",
    "deposit.title": "Depósitos y política del negocio",
    "deposit.shortTitle": "Depósito",
    "deposit.required": "Depósito requerido",
    "deposit.notRequired": "No se requiere depósito",
    "deposit.requireToggle": "Requerir un depósito",
    "deposit.collectionMethod": "Método de cobro",
    "deposit.manual": "Pago manual",
    "deposit.stripe": "Pago con Stripe",
    "deposit.stripeComingSoon": "Stripe estará disponible pronto. Los depósitos manuales funcionan ahora.",
    "deposit.type": "Tipo de depósito",
    "deposit.none": "Ninguno",
    "deposit.fixed": "Cantidad fija",
    "deposit.percent": "Porcentaje del precio del servicio",
    "deposit.amount": "Cantidad del depósito",
    "deposit.amountPlaceholder": "Ejemplo: 25",
    "deposit.policy": "Política de depósito personalizada",
    "deposit.policyHelper": "Escribe las reglas de depósito que tus clientes deben aceptar antes de solicitar este servicio. Esta política es creada por tu negocio, no por SchedNest.",
    "deposit.policyPlaceholder": "Ejemplo: Se requiere un depósito de $25 para apartar tu cita. El depósito se aplica al balance final y no es reembolsable para cancelaciones el mismo día.",
    "deposit.instructions": "Instrucciones de pago manual",
    "deposit.instructionsHelper": "Indica dónde el cliente debe enviar el depósito, como Zelle, Cash App, Venmo, PayPal o transferencia bancaria.",
    "deposit.instructionsPlaceholder": "Ejemplo: Envía el depósito a Zelle: negocio@email.com o Cash App: $NombreNegocio.",
    "deposit.customerAgreement": "He leído y acepto la política de depósito de este negocio.",
    "deposit.customerMustAgree": "Acepta la política de depósito del negocio antes de enviar tu solicitud.",
    "deposit.businessPolicy": "Política escrita por el negocio",
    "deposit.manualInstructions": "Instrucciones de depósito manual",
    "deposit.manualNotice": "SchedNest no puede verificar pagos manuales automáticamente. El negocio debe marcar el depósito como recibido.",
    "deposit.markPaid": "Marcar depósito pagado",
    "deposit.waive": "Perdonar depósito",
    "deposit.paid": "Depósito pagado",
    "deposit.waived": "Depósito perdonado",
    "deposit.pending": "Depósito pendiente",
    "deposit.requiredStatus": "Requerido",
    "deposit.notRequiredStatus": "No requerido",
    "deposit.accepted": "Política aceptada",
    "deposit.notAccepted": "Política no aceptada",
    "deposit.saved": "Configuración de depósito guardada.",
    "deposit.paidMessage": "Depósito marcado como pagado.",
    "deposit.waivedMessage": "Depósito perdonado.",
    "manualPayments.title": "Métodos de pago manual",
    "manualPayments.description": "Agrega los usuarios, enlaces o código QR que los clientes deben usar cuando se requiere un depósito manual.",
    "manualPayments.enabled": "Mostrar métodos de pago manual en la página de reservas",
    "manualPayments.zelle": "Zelle",
    "manualPayments.cashApp": "Cash App",
    "manualPayments.venmo": "Venmo",
    "manualPayments.paypal": "PayPal",
    "manualPayments.other": "Otras instrucciones de pago",
    "manualPayments.qrCode": "Código QR de pago",
    "manualPayments.qrCaption": "Descripción del código QR",
    "manualPayments.uploadQr": "Subir código QR",
    "manualPayments.removeQr": "Quitar código QR",
    "manualPayments.save": "Guardar métodos de pago",
    "manualPayments.saving": "Guardando métodos de pago...",
    "manualPayments.saved": "Métodos de pago manual guardados.",
    "manualPayments.uploaded": "Código QR de pago subido.",
    "manualPayments.publicTitle": "Formas de enviar tu depósito manual",
    "manualPayments.publicDescription": "Usa uno de los métodos de pago abajo, luego el negocio marcará tu depósito como recibido.",
    "manualPayments.noMethods": "Aún no se han agregado métodos de pago manual.",
  },
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): SchedNestLanguage {
  if (typeof window === "undefined") return "en";

  const savedLanguage = window.localStorage.getItem(STORAGE_KEY);

  if (savedLanguage === "en" || savedLanguage === "es") {
    return savedLanguage;
  }

  const browserLanguage = window.navigator.language.toLowerCase();

  if (browserLanguage.startsWith("es")) return "es";

  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SchedNestLanguage>("en");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLanguageState(getInitialLanguage());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    function setLanguage(nextLanguage: SchedNestLanguage) {
      setLanguageState(nextLanguage);
    }

    function t(key: string, fallback?: string) {
      return (
        dictionaries[language][key] ||
        dictionaries.en[key] ||
        fallback ||
        key
      );
    }

    return {
      language,
      setLanguage,
      t,
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}

export function useT() {
  return useLanguage().t;
}
