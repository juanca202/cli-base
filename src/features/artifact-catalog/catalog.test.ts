import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_CATALOG,
  ARTIFACT_TYPES,
  catalogOrder,
  getDescriptor,
  nameRegExp,
} from './catalog.js';

describe('catálogo de tipos', () => {
  it('contiene los 14 tipos de MD-003 en su orden', () => {
    expect(ARTIFACT_CATALOG.map((d) => d.type)).toEqual([
      'SRS', 'RQ', 'US', 'TK', 'WI', 'FT', 'TC', 'RS', 'WF', 'ADR', 'MD', 'API', 'FL', 'DG',
    ]);
    expect(ARTIFACT_TYPES).toHaveLength(14);
  });

  it('catalogOrder sigue la posición del catálogo', () => {
    expect(catalogOrder('SRS')).toBe(0);
    expect(catalogOrder('WF')).toBeLessThan(catalogOrder('ADR'));
    expect(catalogOrder('DG')).toBe(13);
  });

  it('solo MD, API, FL y DG no tienen estado', () => {
    const withoutStatus = ARTIFACT_CATALOG.filter((d) => d.statusValues === null).map((d) => d.type);
    expect(withoutStatus).toEqual(['MD', 'API', 'FL', 'DG']);
  });

  it('conjuntos cerrados de estados por tipo', () => {
    expect(getDescriptor('SRS').statusValues).toEqual(['Draft', 'Ready']);
    expect(getDescriptor('TC').statusValues).toEqual(['Draft', 'Ready', 'Obsolete']);
    expect(getDescriptor('WF').statusValues).toEqual(['Proposed', 'Approved']);
    expect(getDescriptor('ADR').statusValues).toEqual([
      'Draft', 'Proposed', 'Accepted', 'Deprecated', 'Superseded',
    ]);
    for (const type of ['MD', 'API', 'FL', 'DG'] as const) {
      expect(getDescriptor(type).statusValues).toBeNull();
    }
  });

  it('alcance, padres y requisitos por tipo', () => {
    expect(getDescriptor('US').scope).toBe('GLOBAL');
    expect(getDescriptor('TK')).toMatchObject({ scope: 'PARENT', parentTypes: ['US'], requiresParent: true });
    expect(getDescriptor('TC').parentTypes).toEqual(['US', 'WI', 'FT', 'RQ']);
    expect(getDescriptor('WF').parentTypes).toEqual(['SRS', 'US', 'WI']);
    expect(getDescriptor('RS')).toMatchObject({
      requiresParent: false,
      unparentedPathTemplate: '<changes>/research/',
    });
    expect(getDescriptor('ADR').scope).toBe('ARCHITECTURE_ROOT');
    expect(getDescriptor('API')).toMatchObject({
      scope: 'CAPABILITY',
      requiresCapability: true,
      activePathTemplate: '<capability>/apis/',
    });
  });

  it('solo los tipos GLOBAL archivables y RS tienen ruta de archivo propia', () => {
    const archivable = ARTIFACT_CATALOG.filter((d) => d.archivePathTemplate !== null).map((d) => d.type);
    expect(archivable).toEqual(['SRS', 'RQ', 'US', 'WI', 'RS']);
  });

  it('nameRegExp acepta el patrón de cada tipo y captura el secuencial', () => {
    expect(nameRegExp(getDescriptor('US')).exec('US-010-cli-de-consultas')?.[1]).toBe('010');
    expect(nameRegExp(getDescriptor('TK')).exec('TK-002-comandos-next.md')?.[1]).toBe('002');
    expect(nameRegExp(getDescriptor('US')).test('US-10-corto')).toBe(false);
    expect(nameRegExp(getDescriptor('US')).test('US-010-Mayus')).toBe(false);
    expect(nameRegExp(getDescriptor('TK')).test('TK-002-sin-extension')).toBe(false);
    expect(nameRegExp(getDescriptor('SRS')).test('RQ-001-algo')).toBe(false);
  });
});
