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

  it('every profile ships non-empty category catalogs, document tags, and a projects header', () => {
    for (const profile of Object.values(ENTITY_FINANCE_PROFILES)) {
      expect(profile.incomeCategories.length).toBeGreaterThan(3);
      expect(profile.expenseCategories.length).toBeGreaterThan(3);
      expect(profile.documentTags.length).toBeGreaterThan(3);
      expect(profile.projectsHeader.title.length).toBeGreaterThan(0);
      expect(profile.projectsHeader.description.length).toBeGreaterThan(0);
    }
  });

  it('trigger-written category strings stay present in the entity catalogs', () => {
    // The hgp_visit income sync writes these categories (20260716000016) —
    // the HGP income catalog must keep offering the same strings so manual
    // and automated entries classify identically.
    const hgp = financeProfileFor('houston-generator-pros');
    expect(hgp.incomeCategories).toContain('Service Maintenance');
    expect(hgp.incomeCategories).toContain('Emergency Service');
    // The note-payment sync writes Interest Income / Interest Expense.
    const heh = financeProfileFor('houston-enterprise-holdings');
    expect(heh.incomeCategories).toContain('Interest Income');
    expect(heh.expenseCategories).toContain('Interest Expense');
  });

  it('entity catalogs are actually differentiated per business model', () => {
    const he = financeProfileFor('houston-enterprise');
    const hgp = financeProfileFor('houston-generator-pros');
    const heh = financeProfileFor('houston-enterprise-holdings');
    expect(hgp.expenseCategories).toContain('Generator Equipment Purchase');
    expect(he.expenseCategories).not.toContain('Generator Equipment Purchase');
    expect(heh.expenseCategories).toContain('Debt Service');
    expect(he.expenseCategories).not.toContain('Debt Service');
    expect(hgp.documentTags).toContain('Warranty Registration');
    expect(heh.documentTags).toContain('Promissory Note');
    expect(he.documentTags).toContain('Lien Waiver');
  });
});
