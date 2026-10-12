import { describe, it, expect, beforeEach } from 'vitest';
import { migrateStorageKeys, storage, StorageKey } from '../../lib/storage';
import { labelsFor } from '../../lib/labels';

describe('migrateStorageKeys', () => {
    beforeEach(() => localStorage.clear());

    it('moves old keys to their new names and keeps the value', () => {
        localStorage.setItem('salon_board_key', 'BOARD1');
        localStorage.setItem('salon_board_company_id', '42');
        localStorage.setItem('ekuafor_device_fingerprint', 'WEB-ABC');

        migrateStorageKeys();

        expect(storage.get(StorageKey.boardKey)).toBe('BOARD1');
        expect(storage.get(StorageKey.boardCompanyId)).toBe('42');
        expect(storage.get(StorageKey.webDeviceId)).toBe('WEB-ABC');
        expect(localStorage.getItem('salon_board_key')).toBeNull();
        expect(localStorage.getItem('ekuafor_device_fingerprint')).toBeNull();
    });

    it('does not overwrite a value already stored under the new name', () => {
        localStorage.setItem('board_key', 'NEW');
        localStorage.setItem('salon_board_key', 'OLD');

        migrateStorageKeys();

        expect(storage.get(StorageKey.boardKey)).toBe('NEW');
        expect(localStorage.getItem('salon_board_key')).toBeNull();
    });

    it('leaves customer data untouched', () => {
        localStorage.setItem('my_appointment_ids', '[1,2]');
        localStorage.setItem('customer_phone', '05551112233');

        migrateStorageKeys();

        expect(storage.getJson<number[]>(StorageKey.myAppointmentIds, [])).toEqual([1, 2]);
        expect(storage.get(StorageKey.customerPhone)).toBe('05551112233');
    });

    it('returns the fallback for unreadable JSON', () => {
        localStorage.setItem('my_appointment_ids', '{broken');
        expect(storage.getJson<number[]>(StorageKey.myAppointmentIds, [])).toEqual([]);
    });
});

describe('labelsFor', () => {
    it('uses sector wording and lets the company override it', () => {
        expect(labelsFor('dental').staff).toBe('Doktor');
        expect(labelsFor('sports_facility').resource).toBe('Saha');
        expect(labelsFor('pilates_yoga', { staff_label: 'Hoca' }).staff).toBe('Hoca');
        expect(labelsFor(null).service).toBe('Hizmet');
    });
});
