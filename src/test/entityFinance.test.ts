import { describe, expect, it } from 'vitest';
import {
  ENTITY_FINANCE_PROFILES,
  ROUTE_MODULES,
  entityHasModule,
  financeProfileFor,
  moduleLabel,
} from '@/lib/entityFinance';

describe('entity-aware finance profiles', () => {
  it('Houston Enterprise keeps the full construction suite', () => {
    const he = financeProfileFor('houston-enterprise');
    expect(he.overview).toBe('construction');
    expect(he.modules).toContain('controls');
    expect(he.modules).toContain('concierge');
    expect(he.modules).toContain('projects');
  });

  it('HGP gets the generator overview and no construction WIP controls', () => {
    const hgp = financeProfileFor('houston-generator-pros');
    expect(hgp.overview).toBe('generator');
    expect(entityHasModule('houston-generator-pros', 'controls')).toBe(false);
    expect(entityHasModule('houston-generator-pros', 'concierge')).toBe(false);
    expect(entityHasModule('houston-generator-pros', 'ledger')).toBe(true);
    expect(moduleLabel('houston-generator-pros', 'projects', 'Projects')).toBe('Install Jobs');
    expect(moduleLabel('houston-generator-pros', 'vendors', 'Vendors')).toBe('Suppliers');
  });

  it('Holdings gets the holdings overview with capital terminology', () => {
    const heh = financeProfileFor('houston-enterprise-holdings');
    expect(heh.overview).toBe('holdings');
    expect(entityHasModule('houston-enterprise-holdings', 'controls')).toBe(false);
    expect(entityHasModule('houston-enterprise-holdings', 'checks')).toBe(true);
    expect(moduleLabel('houston-enterprise-holdings', 'projects', 'Projects')).toBe('Assets & Deals');
    expect(moduleLabel('houston-enterprise-holdings', 'expenses', 'Expenses')).toBe('Corporate Expenses');
  });

  it('unknown or missing entities fall back to the full Houston Enterprise profile', () => {
    expect(financeProfileFor(null).overview).toBe('construction');
    expect(financeProfileFor('some-future-entity').modules).toEqual(
      ENTITY_FINANCE_PROFILES['houston-enterprise'].modules,
    );
    expect(entityHasModule(undefined, 'ledger')).toBe(true);
  });

  it('every profile keeps the shared finance primitives', () => {
    for (const profile of Object.values(ENTITY_FINANCE_PROFILES)) {
      for (const core of ['overview', 'ledger', 'income', 'expenses', 'documents', 'changelog'] as const) {
        expect(profile.modules).toContain(core);
      }
    }
  });

  it('route→module map only names modules that exist in every profile shape', () => {
    const knownModules = new Set(ENTITY_FINANCE_PROFILES['houston-enterprise'].modules);
    for (const mod of Object.values(ROUTE_MODULES)) {
      expect(knownModules.has(mod)).toBe(true);
    }
  });
});
