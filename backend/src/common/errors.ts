export const ErrMsg = {
  EMAIL_REGISTERED: 'el correo ya está registrado',
  CONTENT_NOT_FOUND: 'elemento de contenido no encontrado',
  TASK_NOT_FOUND: 'tarea no encontrada',
  COMMENT_NOT_FOUND: 'comentario no encontrado',
  WORKSPACE_NOT_FOUND: 'espacio de trabajo no encontrado',
  INVITE_NOT_FOUND: 'invitacion no encontrada',
  INVITE_UNAVAILABLE: 'la invitacion expiro o no tiene usos disponibles',
  ADMIN_ROLE_REQUIRED: 'se requiere rol de administrador',
  CLIENT_NOT_FOUND: 'cliente no encontrado',
  PROJECT_NOT_FOUND: 'proyecto no encontrado',
};

export class InvalidReferenceError extends Error {
  constructor(
    public field: string,
    message: string,
  ) {
    super(message);
    this.name = 'InvalidReferenceError';
  }
}

export class InvalidEnumError extends Error {
  constructor(
    public field: string,
    public value: string,
    public allowed: string[],
  ) {
    super(`valor inválido para ${field}: "${value}" (permitidos: ${allowed.join(', ')})`);
    this.name = 'InvalidEnumError';
  }
}

export class InvalidFormatError extends Error {
  constructor(
    public field: string,
    public value: string,
    public expected: string,
  ) {
    super(`formato inválido para ${field}: "${value}" (se espera ${expected})`);
    this.name = 'InvalidFormatError';
  }
}

export class InvalidTransitionError extends Error {
  constructor(
    public from: string,
    public to: string,
    public allowed: string[],
  ) {
    super(`cannot transition from ${from} to ${to}; allowed: ${allowed.join(', ')}`);
    this.name = 'InvalidTransitionError';
  }
}
