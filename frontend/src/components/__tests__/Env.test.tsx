import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Frontend Testing Setup', () => {
    it('should pass a basic truthy test', () => {
        expect(true).toBe(true);
    });

    it('should have jsdom environment', () => {
        const element = document.createElement('div');
        document.body.appendChild(element); // Fix: Append to body so it is "in the document"
        expect(element).toBeInTheDocument();
    });
});
