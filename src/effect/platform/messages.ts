import { Effect } from 'effect';

export const SUPPORTED_LOCALES = ['en', 'fr', 'de'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

export type MessageArgs = Record<string, unknown>;

const enCatalog = {
  'areas.circularReference':
    'Cannot set the parent area because it would create a circular reference.',
  'areas.deleted': 'Area deleted successfully.',
  'areas.locationNotFound': 'Location not found.',
  'areas.notFound': 'Area not found.',
  'areas.parentLocationMismatch':
    'The parent area must belong to the same location.',
  'areas.parentNotFound': 'Parent area not found.',
  'areas.repositoryFailed': 'Area operation failed.',
  'areas.selfParent': 'An area cannot be its own parent.',
  'audit.writeFailed': 'Audit log write failed.',
  'auditLogs.notFound': 'Audit log not found.',
  'auditLogs.repositoryFailed': 'Audit log operation failed.',
  'auth.permissionDenied': 'Insufficient permissions.',
  'auth.unauthorized': 'Unauthorized.',
  'branding.repositoryFailed': 'Branding operation failed.',
  'branding.sessionUserUnavailable': 'Session user is not available.',
  'categories.circularReference':
    'Cannot set the parent category because it would create a circular reference.',
  'categories.deleted': 'Category deleted successfully.',
  'categories.nameAlreadyExists':
    'A category with this name already exists.',
  'categories.notFound': 'Category not found.',
  'categories.parentNotFound': 'Parent category not found.',
  'categories.repositoryFailed': 'Category operation failed.',
  'categories.selfParent': 'A category cannot be its own parent.',
  'clients.deleted': 'Client deleted successfully.',
  'clients.emailAlreadyExists':
    'A client with this email address already exists.',
  'clients.notFound': 'Client not found.',
  'clients.repositoryFailed': 'Client operation failed.',
  'drizzle.initializationFailed':
    'Failed to initialize the database connection.',
  'drizzle.migrationsFailed': 'Failed to run Better Auth migrations.',
  'errors.internalServerError': 'Internal Server Error.',
  'fulfillment.infrastructureFailed': 'Fulfillment operation failed.',
  'fulfillment.insufficientInventory':
    'Insufficient inventory to fulfill the pick.',
  'fulfillment.notPickable':
    'The order must already be confirmed or picking.',
  'fulfillment.onlyDraftCanConfirm':
    'Only draft orders can be confirmed.',
  'fulfillment.orderItemNotFound': 'Order item not found.',
  'fulfillment.orderNotFound': 'Order not found.',
  'fulfillment.overPick':
    'The picked quantity would exceed the ordered amount.',
  'fulfillment.packNotImplemented':
    'Packing is not implemented yet in the fulfillment workflow.',
  'fulfillment.shipNotImplemented':
    'Shipping is not implemented yet in the fulfillment workflow.',
  'health.betterAuthConfigured': 'Better Auth is properly configured.',
  'health.betterAuthSecretMissing':
    'BETTER_AUTH_SECRET is not configured.',
  'health.databaseUnreachable': 'Database is unreachable.',
  'http.parseError': 'Invalid request payload: {details}',
  'http.request': 'HTTP request completed.',
  'http.requestBodyTooLarge': 'Request body exceeds the 10 MB limit.',
  'http.requestError': 'Invalid request: {details}',
  'http.routeNotFound': 'Cannot {method} {path}.',
  'http.serverError': 'HTTP server error.',
  'http.unexpectedError': 'Unexpected error: {details}',
  'inventory.alreadyExists':
    'Inventory already exists for this product and location.',
  'inventory.areaLocationMismatch':
    'The selected area must belong to the selected location.',
  'inventory.areaNotFound': 'Area not found.',
  'inventory.deleted': 'Inventory item deleted successfully.',
  'inventory.infrastructureFailed': 'Inventory operation failed.',
  'inventory.locationNotFound': 'Location not found.',
  'inventory.notFound': 'Inventory item not found.',
  'inventory.productNotFound': 'Product not found.',
  'inventory.quantityAdjustmentNegative':
    'The inventory adjustment would result in a negative quantity.',
  'locations.deleted': 'Location deleted successfully.',
  'locations.notFound': 'Location not found.',
  'locations.repositoryFailed': 'Location operation failed.',
  'orders.clientNotFound': 'Client not found.',
  'orders.deleteOnlyDraft': 'Only draft orders can be deleted.',
  'orders.deleted': 'Order deleted successfully.',
  'orders.infrastructureFailed': 'Order operation failed.',
  'orders.invalidStatusTransition':
    'Cannot transition from {from} to {to}.',
  'orders.notFound': 'Order not found.',
  'orders.productNotFound': 'Product not found.',
  'photos.deleted': 'Photo deleted successfully.',
  'photos.deleteFailed': 'Failed to delete the photo file.',
  'photos.existenceCheckFailed': 'Failed to check whether the photo exists.',
  'photos.fileNotFound': 'Photo file not found on disk.',
  'photos.invalidMimeType':
    'Invalid file type. Allowed types: {allowedTypes}.',
  'photos.notFound': 'Photo not found.',
  'photos.readUploadFailed': 'Failed to read the uploaded file.',
  'photos.repositoryFailed': 'Photo operation failed.',
  'photos.statUploadFailed': 'Failed to read uploaded file metadata.',
  'photos.tooLarge':
    'File is too large. Maximum allowed size is {maxSize} bytes.',
  'photos.writeFailed': 'Failed to write the photo file.',
  'products.categoryNotFound': 'Category not found.',
  'products.createdProductLoadFailed':
    'Failed to load the created product.',
  'products.deleted': 'Product deleted successfully.',
  'products.deletedPermanent': 'Product permanently deleted.',
  'products.infrastructureFailed': 'Product operation failed.',
  'products.notDeleted': 'Product is not deleted.',
  'products.notFound': 'Product not found.',
  'products.priceBelowCost':
    'Standard price must be greater than or equal to standard cost.',
  'products.repositoryFailed': 'Product operation failed.',
  'products.skuAlreadyExists': 'A product with this SKU already exists.',
  'roles.infrastructureFailed': 'Role operation failed.',
  'roles.loadPermissionsFailed': 'Failed to load user permissions.',
  'roles.nameAlreadyExists': 'A role with this name already exists.',
  'roles.notFound': 'Role not found.',
  'roles.repositoryFailed': 'Role operation failed.',
  'roles.systemDeletionForbidden': 'System roles cannot be deleted.',
  'session.resolveFailed': 'Failed to resolve the user session.',
  'stockMovements.destinationLocationNotFound':
    'Destination location not found.',
  'stockMovements.infrastructureFailed':
    'Stock movement operation failed.',
  'stockMovements.locationNotFound': 'Location not found.',
  'stockMovements.notFound': 'Stock movement not found.',
  'stockMovements.productNotFound': 'Product not found.',
  'stockMovements.repositoryFailed': 'Stock movement operation failed.',
  'stockMovements.sourceLocationNotFound': 'Source location not found.',
  'suppliers.deleted': 'Supplier deleted successfully.',
  'suppliers.notFound': 'Supplier not found.',
  'suppliers.repositoryFailed': 'Supplier operation failed.',
  'users.infrastructureFailed': 'User operation failed.',
  'users.notFound': 'User not found.',
  'users.repositoryFailed': 'User operation failed.',
} as const;

export type MessageKey = keyof typeof enCatalog;
export type AnyMessageKey = MessageKey | (string & {});

const frCatalog: Record<MessageKey, string> = {
  'areas.circularReference':
    "Impossible de definir cette zone parente car cela creerait une reference circulaire.",
  'areas.deleted': 'Zone supprimee avec succes.',
  'areas.locationNotFound': 'Emplacement introuvable.',
  'areas.notFound': 'Zone introuvable.',
  'areas.parentLocationMismatch':
    "La zone parente doit appartenir au meme emplacement.",
  'areas.parentNotFound': 'Zone parente introuvable.',
  'areas.repositoryFailed': "L'operation sur la zone a echoue.",
  'areas.selfParent': 'Une zone ne peut pas etre sa propre parente.',
  'audit.writeFailed': "L'ecriture du journal d'audit a echoue.",
  'auditLogs.notFound': "Journal d'audit introuvable.",
  'auditLogs.repositoryFailed':
    "L'operation sur le journal d'audit a echoue.",
  'auth.permissionDenied': 'Permissions insuffisantes.',
  'auth.unauthorized': 'Non autorise.',
  'branding.repositoryFailed': "L'operation de branding a echoue.",
  'branding.sessionUserUnavailable':
    "L'utilisateur de session n'est pas disponible.",
  'categories.circularReference':
    "Impossible de definir cette categorie parente car cela creerait une reference circulaire.",
  'categories.deleted': 'Categorie supprimee avec succes.',
  'categories.nameAlreadyExists':
    'Une categorie avec ce nom existe deja.',
  'categories.notFound': 'Categorie introuvable.',
  'categories.parentNotFound': 'Categorie parente introuvable.',
  'categories.repositoryFailed': "L'operation sur la categorie a echoue.",
  'categories.selfParent':
    'Une categorie ne peut pas etre sa propre parente.',
  'clients.deleted': 'Client supprime avec succes.',
  'clients.emailAlreadyExists':
    'Un client avec cette adresse e-mail existe deja.',
  'clients.notFound': 'Client introuvable.',
  'clients.repositoryFailed': "L'operation sur le client a echoue.",
  'drizzle.initializationFailed':
    "Echec de l'initialisation de la connexion a la base de donnees.",
  'drizzle.migrationsFailed':
    "Echec de l'execution des migrations Better Auth.",
  'errors.internalServerError': 'Erreur interne du serveur.',
  'fulfillment.infrastructureFailed':
    "L'operation de preparation a echoue.",
  'fulfillment.insufficientInventory':
    "Stock insuffisant pour effectuer le prelevement.",
  'fulfillment.notPickable':
    'La commande doit deja etre confirmee ou en preparation.',
  'fulfillment.onlyDraftCanConfirm':
    'Seules les commandes brouillon peuvent etre confirmees.',
  'fulfillment.orderItemNotFound':
    'Ligne de commande introuvable.',
  'fulfillment.orderNotFound': 'Commande introuvable.',
  'fulfillment.overPick':
    'La quantite prelevee depasserait la quantite commandee.',
  'fulfillment.packNotImplemented':
    "L'emballage n'est pas encore implemente dans le flux de preparation.",
  'fulfillment.shipNotImplemented':
    "L'expedition n'est pas encore implementee dans le flux de preparation.",
  'health.betterAuthConfigured':
    'Better Auth est correctement configure.',
  'health.betterAuthSecretMissing':
    'BETTER_AUTH_SECRET nest pas configure.',
  'health.databaseUnreachable': 'La base de donnees est inaccessible.',
  'http.parseError': 'Charge utile invalide : {details}',
  'http.request': 'Requete HTTP terminee.',
  'http.requestBodyTooLarge':
    'Le corps de la requete depasse la limite de 10 Mo.',
  'http.requestError': 'Requete invalide : {details}',
  'http.routeNotFound': 'Impossible de {method} {path}.',
  'http.serverError': 'Erreur serveur HTTP.',
  'http.unexpectedError': 'Erreur inattendue : {details}',
  'inventory.alreadyExists':
    'Un stock existe deja pour ce produit et cet emplacement.',
  'inventory.areaLocationMismatch':
    'La zone selectionnee doit appartenir a lemplacement selectionne.',
  'inventory.areaNotFound': 'Zone introuvable.',
  'inventory.deleted': 'Element de stock supprime avec succes.',
  'inventory.infrastructureFailed': "L'operation de stock a echoue.",
  'inventory.locationNotFound': 'Emplacement introuvable.',
  'inventory.notFound': 'Element de stock introuvable.',
  'inventory.productNotFound': 'Produit introuvable.',
  'inventory.quantityAdjustmentNegative':
    'Lajustement de stock produirait une quantite negative.',
  'locations.deleted': 'Emplacement supprime avec succes.',
  'locations.notFound': 'Emplacement introuvable.',
  'locations.repositoryFailed': "L'operation sur lemplacement a echoue.",
  'orders.clientNotFound': 'Client introuvable.',
  'orders.deleteOnlyDraft':
    'Seules les commandes brouillon peuvent etre supprimees.',
  'orders.deleted': 'Commande supprimee avec succes.',
  'orders.infrastructureFailed': "L'operation sur la commande a echoue.",
  'orders.invalidStatusTransition':
    'Transition impossible de {from} vers {to}.',
  'orders.notFound': 'Commande introuvable.',
  'orders.productNotFound': 'Produit introuvable.',
  'photos.deleted': 'Photo supprimee avec succes.',
  'photos.deleteFailed': 'La suppression du fichier photo a echoue.',
  'photos.existenceCheckFailed':
    'La verification de lexistence de la photo a echoue.',
  'photos.fileNotFound': 'Le fichier photo est introuvable sur le disque.',
  'photos.invalidMimeType':
    'Type de fichier invalide. Types autorises : {allowedTypes}.',
  'photos.notFound': 'Photo introuvable.',
  'photos.readUploadFailed': 'La lecture du fichier televerse a echoue.',
  'photos.repositoryFailed': "L'operation sur la photo a echoue.",
  'photos.statUploadFailed':
    'La lecture des metadonnees du fichier televerse a echoue.',
  'photos.tooLarge':
    'Le fichier est trop volumineux. Taille maximale autorisee : {maxSize} octets.',
  'photos.writeFailed': "L'ecriture du fichier photo a echoue.",
  'products.categoryNotFound': 'Categorie introuvable.',
  'products.createdProductLoadFailed':
    'Le chargement du produit cree a echoue.',
  'products.deleted': 'Produit supprime avec succes.',
  'products.deletedPermanent': 'Produit supprime definitivement.',
  'products.infrastructureFailed': "L'operation sur le produit a echoue.",
  'products.notDeleted': 'Le produit nest pas supprime.',
  'products.notFound': 'Produit introuvable.',
  'products.priceBelowCost':
    'Le prix standard doit etre superieur ou egal au cout standard.',
  'products.repositoryFailed': "L'operation sur le produit a echoue.",
  'products.skuAlreadyExists':
    'Un produit avec ce SKU existe deja.',
  'roles.infrastructureFailed': "L'operation sur le role a echoue.",
  'roles.loadPermissionsFailed':
    'Le chargement des permissions utilisateur a echoue.',
  'roles.nameAlreadyExists': 'Un role avec ce nom existe deja.',
  'roles.notFound': 'Role introuvable.',
  'roles.repositoryFailed': "L'operation sur le role a echoue.",
  'roles.systemDeletionForbidden':
    'Les roles systeme ne peuvent pas etre supprimes.',
  'session.resolveFailed':
    "La resolution de la session utilisateur a echoue.",
  'stockMovements.destinationLocationNotFound':
    'Emplacement de destination introuvable.',
  'stockMovements.infrastructureFailed':
    "L'operation sur le mouvement de stock a echoue.",
  'stockMovements.locationNotFound': 'Emplacement introuvable.',
  'stockMovements.notFound': 'Mouvement de stock introuvable.',
  'stockMovements.productNotFound': 'Produit introuvable.',
  'stockMovements.repositoryFailed':
    "L'operation sur le mouvement de stock a echoue.",
  'stockMovements.sourceLocationNotFound':
    'Emplacement source introuvable.',
  'suppliers.deleted': 'Fournisseur supprime avec succes.',
  'suppliers.notFound': 'Fournisseur introuvable.',
  'suppliers.repositoryFailed': "L'operation sur le fournisseur a echoue.",
  'users.infrastructureFailed': "L'operation sur l'utilisateur a echoue.",
  'users.notFound': 'Utilisateur introuvable.',
  'users.repositoryFailed': "L'operation sur l'utilisateur a echoue.",
};

const deCatalog: Record<MessageKey, string> = {
  'areas.circularReference':
    'Der Elternbereich kann nicht gesetzt werden, weil dadurch ein Zirkelbezug entstuende.',
  'areas.deleted': 'Bereich erfolgreich geloescht.',
  'areas.locationNotFound': 'Standort nicht gefunden.',
  'areas.notFound': 'Bereich nicht gefunden.',
  'areas.parentLocationMismatch':
    'Der Elternbereich muss zum selben Standort gehoeren.',
  'areas.parentNotFound': 'Elternbereich nicht gefunden.',
  'areas.repositoryFailed': 'Der Bereichsvorgang ist fehlgeschlagen.',
  'areas.selfParent':
    'Ein Bereich kann nicht sein eigener Elternbereich sein.',
  'audit.writeFailed': 'Das Schreiben des Audit-Logs ist fehlgeschlagen.',
  'auditLogs.notFound': 'Audit-Log nicht gefunden.',
  'auditLogs.repositoryFailed':
    'Der Audit-Log-Vorgang ist fehlgeschlagen.',
  'auth.permissionDenied': 'Unzureichende Berechtigungen.',
  'auth.unauthorized': 'Nicht autorisiert.',
  'branding.repositoryFailed': 'Der Branding-Vorgang ist fehlgeschlagen.',
  'branding.sessionUserUnavailable':
    'Der Sitzungsbenutzer ist nicht verfuegbar.',
  'categories.circularReference':
    'Die Elternkategorie kann nicht gesetzt werden, weil dadurch ein Zirkelbezug entstuende.',
  'categories.deleted': 'Kategorie erfolgreich geloescht.',
  'categories.nameAlreadyExists':
    'Eine Kategorie mit diesem Namen existiert bereits.',
  'categories.notFound': 'Kategorie nicht gefunden.',
  'categories.parentNotFound': 'Elternkategorie nicht gefunden.',
  'categories.repositoryFailed':
    'Der Kategorienvorgang ist fehlgeschlagen.',
  'categories.selfParent':
    'Eine Kategorie kann nicht ihre eigene Elternkategorie sein.',
  'clients.deleted': 'Kunde erfolgreich geloescht.',
  'clients.emailAlreadyExists':
    'Ein Kunde mit dieser E-Mail-Adresse existiert bereits.',
  'clients.notFound': 'Kunde nicht gefunden.',
  'clients.repositoryFailed': 'Der Kundenvorgang ist fehlgeschlagen.',
  'drizzle.initializationFailed':
    'Die Initialisierung der Datenbankverbindung ist fehlgeschlagen.',
  'drizzle.migrationsFailed':
    'Die Better-Auth-Migrationen konnten nicht ausgefuehrt werden.',
  'errors.internalServerError': 'Interner Serverfehler.',
  'fulfillment.infrastructureFailed':
    'Der Fulfillment-Vorgang ist fehlgeschlagen.',
  'fulfillment.insufficientInventory':
    'Nicht genug Bestand fuer die Kommissionierung vorhanden.',
  'fulfillment.notPickable':
    'Die Bestellung muss bestaetigt oder bereits in Kommissionierung sein.',
  'fulfillment.onlyDraftCanConfirm':
    'Nur Entwurfsbestellungen koennen bestaetigt werden.',
  'fulfillment.orderItemNotFound':
    'Bestellposition nicht gefunden.',
  'fulfillment.orderNotFound': 'Bestellung nicht gefunden.',
  'fulfillment.overPick':
    'Die kommissionierte Menge wuerde die bestellte Menge ueberschreiten.',
  'fulfillment.packNotImplemented':
    'Das Verpacken ist im Fulfillment-Ablauf noch nicht implementiert.',
  'fulfillment.shipNotImplemented':
    'Der Versand ist im Fulfillment-Ablauf noch nicht implementiert.',
  'health.betterAuthConfigured':
    'Better Auth ist korrekt konfiguriert.',
  'health.betterAuthSecretMissing':
    'BETTER_AUTH_SECRET ist nicht konfiguriert.',
  'health.databaseUnreachable': 'Die Datenbank ist nicht erreichbar.',
  'http.parseError': 'Ungueltige Anfrage-Nutzlast: {details}',
  'http.request': 'HTTP-Anfrage abgeschlossen.',
  'http.requestBodyTooLarge':
    'Der Anfragetext ueberschreitet das 10-MB-Limit.',
  'http.requestError': 'Ungueltige Anfrage: {details}',
  'http.routeNotFound': '{method} {path} kann nicht ausgefuehrt werden.',
  'http.serverError': 'HTTP-Serverfehler.',
  'http.unexpectedError': 'Unerwarteter Fehler: {details}',
  'inventory.alreadyExists':
    'Bestand fuer dieses Produkt und diesen Standort existiert bereits.',
  'inventory.areaLocationMismatch':
    'Der ausgewaehlte Bereich muss zum ausgewaehlten Standort gehoeren.',
  'inventory.areaNotFound': 'Bereich nicht gefunden.',
  'inventory.deleted': 'Bestandseintrag erfolgreich geloescht.',
  'inventory.infrastructureFailed':
    'Der Bestandsvorgang ist fehlgeschlagen.',
  'inventory.locationNotFound': 'Standort nicht gefunden.',
  'inventory.notFound': 'Bestandseintrag nicht gefunden.',
  'inventory.productNotFound': 'Produkt nicht gefunden.',
  'inventory.quantityAdjustmentNegative':
    'Die Bestandsanpassung wuerde zu einer negativen Menge fuehren.',
  'locations.deleted': 'Standort erfolgreich geloescht.',
  'locations.notFound': 'Standort nicht gefunden.',
  'locations.repositoryFailed': 'Der Standortvorgang ist fehlgeschlagen.',
  'orders.clientNotFound': 'Kunde nicht gefunden.',
  'orders.deleteOnlyDraft':
    'Nur Entwurfsbestellungen koennen geloescht werden.',
  'orders.deleted': 'Bestellung erfolgreich geloescht.',
  'orders.infrastructureFailed':
    'Der Bestellvorgang ist fehlgeschlagen.',
  'orders.invalidStatusTransition':
    'Uebergang von {from} nach {to} ist nicht erlaubt.',
  'orders.notFound': 'Bestellung nicht gefunden.',
  'orders.productNotFound': 'Produkt nicht gefunden.',
  'photos.deleted': 'Foto erfolgreich geloescht.',
  'photos.deleteFailed': 'Die Fotodatei konnte nicht geloescht werden.',
  'photos.existenceCheckFailed':
    'Die Pruefung auf das Vorhandensein des Fotos ist fehlgeschlagen.',
  'photos.fileNotFound': 'Fotodatei auf dem Datentraeger nicht gefunden.',
  'photos.invalidMimeType':
    'Ungueltiger Dateityp. Erlaubte Typen: {allowedTypes}.',
  'photos.notFound': 'Foto nicht gefunden.',
  'photos.readUploadFailed':
    'Die hochgeladene Datei konnte nicht gelesen werden.',
  'photos.repositoryFailed': 'Der Fotovorgang ist fehlgeschlagen.',
  'photos.statUploadFailed':
    'Die Metadaten der hochgeladenen Datei konnten nicht gelesen werden.',
  'photos.tooLarge':
    'Die Datei ist zu gross. Maximal zulaessige Groesse: {maxSize} Byte.',
  'photos.writeFailed': 'Die Fotodatei konnte nicht geschrieben werden.',
  'products.categoryNotFound': 'Kategorie nicht gefunden.',
  'products.createdProductLoadFailed':
    'Das neu erstellte Produkt konnte nicht geladen werden.',
  'products.deleted': 'Produkt erfolgreich geloescht.',
  'products.deletedPermanent': 'Produkt dauerhaft geloescht.',
  'products.infrastructureFailed':
    'Der Produktvorgang ist fehlgeschlagen.',
  'products.notDeleted': 'Das Produkt ist nicht geloescht.',
  'products.notFound': 'Produkt nicht gefunden.',
  'products.priceBelowCost':
    'Der Standardpreis muss groesser oder gleich den Standardkosten sein.',
  'products.repositoryFailed': 'Der Produktvorgang ist fehlgeschlagen.',
  'products.skuAlreadyExists':
    'Ein Produkt mit dieser SKU existiert bereits.',
  'roles.infrastructureFailed': 'Der Rollenvorgang ist fehlgeschlagen.',
  'roles.loadPermissionsFailed':
    'Die Benutzerberechtigungen konnten nicht geladen werden.',
  'roles.nameAlreadyExists':
    'Eine Rolle mit diesem Namen existiert bereits.',
  'roles.notFound': 'Rolle nicht gefunden.',
  'roles.repositoryFailed': 'Der Rollenvorgang ist fehlgeschlagen.',
  'roles.systemDeletionForbidden':
    'Systemrollen koennen nicht geloescht werden.',
  'session.resolveFailed':
    'Die Aufloesung der Benutzersitzung ist fehlgeschlagen.',
  'stockMovements.destinationLocationNotFound':
    'Zielstandort nicht gefunden.',
  'stockMovements.infrastructureFailed':
    'Der Lagerbewegungsvorgang ist fehlgeschlagen.',
  'stockMovements.locationNotFound': 'Standort nicht gefunden.',
  'stockMovements.notFound': 'Lagerbewegung nicht gefunden.',
  'stockMovements.productNotFound': 'Produkt nicht gefunden.',
  'stockMovements.repositoryFailed':
    'Der Lagerbewegungsvorgang ist fehlgeschlagen.',
  'stockMovements.sourceLocationNotFound':
    'Quellstandort nicht gefunden.',
  'suppliers.deleted': 'Lieferant erfolgreich geloescht.',
  'suppliers.notFound': 'Lieferant nicht gefunden.',
  'suppliers.repositoryFailed':
    'Der Lieferantenvorgang ist fehlgeschlagen.',
  'users.infrastructureFailed':
    'Der Benutzervorgang ist fehlgeschlagen.',
  'users.notFound': 'Benutzer nicht gefunden.',
  'users.repositoryFailed': 'Der Benutzervorgang ist fehlgeschlagen.',
};

export const messageCatalogs = {
  en: enCatalog,
  fr: frCatalog,
  de: deCatalog,
} satisfies Record<SupportedLocale, Record<MessageKey, string>>;

export interface LogEntry {
  readonly messageKey: AnyMessageKey;
  readonly messageArgs?: MessageArgs;
}

export interface TranslatableMessageDescriptor {
  readonly messageKey: AnyMessageKey;
  readonly messageArgs?: MessageArgs;
}

export interface TranslatableMessage extends TranslatableMessageDescriptor {
  readonly message: string;
}

const toCamelCase = (value: string) =>
  value.replace(/[\s_-]+([\dA-Za-z])/g, (_: string, char: string) =>
    char.toUpperCase(),
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const formatMessageValue = (value: unknown): string => {
  if (value == null) {
    return '';
  }

  if (value instanceof Error) {
    return value.message;
  }

  if (
    typeof value === 'object' ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return JSON.stringify(value);
  }

  return String(value);
};

const formatMessageTemplate = (
  template: string,
  messageArgs?: MessageArgs,
) => {
  if (!messageArgs) {
    return template;
  }

  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, key: string) => {
    if (!(key in messageArgs)) {
      return `{${key}}`;
    }

    return formatMessageValue(messageArgs[key]);
  });
};

const normalizeLocale = (value: string): SupportedLocale | undefined => {
  const normalized = value.trim().toLowerCase();
  if (normalized === '') {
    return undefined;
  }

  if (normalized === '*') {
    return DEFAULT_LOCALE;
  }

  const language = normalized.split('-')[0];
  if (language === 'en' || language === 'fr' || language === 'de') {
    return language;
  }

  return undefined;
};

export const toMessageKey = (scope: string, key: string) => {
  const normalized = toCamelCase(key);
  return `${scope}.${normalized.charAt(0).toLowerCase()}${normalized.slice(1)}`;
};

export const resolveLocale = (
  acceptLanguageHeader?: string | null,
): SupportedLocale => {
  if (!acceptLanguageHeader) {
    return DEFAULT_LOCALE;
  }

  const candidates = acceptLanguageHeader
    .split(',')
    .map((token) => {
      const [tag, ...params] = token.trim().split(';');
      const qualityParam = params.find((part) => part.trim().startsWith('q='));
      const quality = qualityParam
        ? Number.parseFloat(qualityParam.trim().slice(2))
        : 1;

      return {
        locale: normalizeLocale(tag ?? ''),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter(
      (candidate): candidate is { locale: SupportedLocale; quality: number } =>
        candidate.locale !== undefined,
    )
    .sort((left, right) => right.quality - left.quality);

  return candidates[0]?.locale ?? DEFAULT_LOCALE;
};

export const translateMessage = (
  locale: SupportedLocale,
  messageKey: AnyMessageKey,
  messageArgs?: MessageArgs,
): string => {
  const localizedCatalog = messageCatalogs[locale] as Record<string, string>;
  const englishCatalog = messageCatalogs.en as Record<string, string>;
  const template =
    localizedCatalog[messageKey] ??
    englishCatalog[messageKey] ??
    String(messageKey);

  return formatMessageTemplate(template, messageArgs);
};

export const makeMessageResponse = (
  messageKey: AnyMessageKey,
  messageArgs?: MessageArgs,
): TranslatableMessageDescriptor => ({
  messageKey,
  ...(messageArgs ? { messageArgs } : {}),
});

const hasMessageKey = (
  value: Record<string, unknown>,
): value is Record<string, unknown> & TranslatableMessageDescriptor =>
  typeof value.messageKey === 'string';

export const localizeMessageTree = (
  value: unknown,
  locale: SupportedLocale,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => localizeMessageTree(item, locale));
  }

  if (!isRecord(value)) {
    return value;
  }

  const localizedEntries = Object.entries(value).map(([key, entry]) => [
    key,
    key === 'messageArgs' ? entry : localizeMessageTree(entry, locale),
  ]);

  const localized = Object.fromEntries(localizedEntries) as Record<
    string,
    unknown
  >;

  if (!hasMessageKey(localized)) {
    return localized;
  }

  const messageArgs = isRecord(localized.messageArgs)
    ? localized.messageArgs
    : undefined;

  return {
    ...localized,
    ...(messageArgs ? { messageArgs } : {}),
    message: translateMessage(locale, localized.messageKey, messageArgs),
  } satisfies Record<string, unknown>;
};

class Logger {
  private readonly scope: string;

  constructor(scope: string) {
    this.scope = scope;
  }

  private logWithKey(
    level: 'info' | 'warn' | 'error' | 'debug',
    messageKey: string,
    args?: MessageArgs,
  ): Effect.Effect<void> {
    const payload = {
      messageKey: `${this.scope}.${messageKey}`,
      ...(args ? { messageArgs: args } : {}),
    };

    switch (level) {
      case 'error':
        return Effect.logError(payload);
      case 'warn':
        return Effect.logWarning(payload);
      case 'debug':
        return Effect.logDebug(payload);
      default:
        return Effect.log(payload);
    }
  }

  info(messageKey: string, args?: MessageArgs): Effect.Effect<void> {
    return this.logWithKey('info', messageKey, args);
  }

  warn(messageKey: string, args?: MessageArgs): Effect.Effect<void> {
    return this.logWithKey('warn', messageKey, args);
  }

  error(messageKey: string, args?: MessageArgs): Effect.Effect<void> {
    return this.logWithKey('error', messageKey, args);
  }

  debug(messageKey: string, args?: MessageArgs): Effect.Effect<void> {
    return this.logWithKey('debug', messageKey, args);
  }

  log(messageKey: string, args?: MessageArgs): Effect.Effect<void> {
    return this.logWithKey('info', messageKey, args);
  }
}

export const createLogger = (scope: string): Logger => new Logger(scope);
