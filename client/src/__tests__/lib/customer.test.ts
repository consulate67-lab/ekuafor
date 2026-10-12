import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { dialNumber } from '../../lib/phone';
import { directionsUrl, formatDistance } from '../../lib/geo';
import { useFavorites } from '../../hooks/useFavorites';

describe('dialNumber', () => {
    it('normalizes Turkish numbers to 0XXXXXXXXXX', () => {
        expect(dialNumber('+90 555 111 22 33')).toBe('05551112233');
        expect(dialNumber('5551112233')).toBe('05551112233');
        expect(dialNumber('0212 444 55 66')).toBe('02124445566');
        expect(dialNumber(null)).toBe('');
    });
});

describe('formatDistance', () => {
    it('uses metres under 1 km', () => {
        expect(formatDistance(0.42)).toBe('420 m');
        expect(formatDistance(3.456)).toBe('3.5 km');
        expect(formatDistance(23.4)).toBe('23 km');
        expect(formatDistance(null)).toBeNull();
    });
});

describe('directionsUrl (web)', () => {
    it('uses coordinates when present, otherwise the address', () => {
        expect(directionsUrl({ name: 'Saha', latitude: '41.1', longitude: 29 })).toContain('destination=41.1%2C29');
        expect(directionsUrl({ name: 'Saha', latitude: 0, longitude: 0, district: 'Kadıköy', city: 'İstanbul' }))
            .toContain(encodeURIComponent('Saha Kadıköy İstanbul'));
    });
});

describe('useFavorites', () => {
    beforeEach(() => localStorage.clear());

    it('toggles and keeps every mounted hook in sync', () => {
        const a = renderHook(() => useFavorites());
        const b = renderHook(() => useFavorites());

        act(() => a.result.current.toggle(7));
        expect(b.result.current.ids).toEqual([7]);
        expect(JSON.parse(localStorage.getItem('saloon_favorites')!)).toEqual([7]);

        act(() => b.result.current.toggle(7));
        expect(a.result.current.isFavorite(7)).toBe(false);
    });
});
