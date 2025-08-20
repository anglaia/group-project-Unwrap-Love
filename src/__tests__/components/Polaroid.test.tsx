import { render, screen, fireEvent } from '../test-utils';
import { Polaroid } from '@/components/Polaroid';
import '@testing-library/jest-dom';

describe('Polaroid Component', () => {
    it('renders correctly with expected elements', () => {
        const mockOnClick = jest.fn();
        render(<Polaroid onClick={mockOnClick} />);

        // Check for the button
        const button = screen.getByRole('button', { name: 'Add Media' });
        expect(button).toBeInTheDocument();

        // Check that the text is rendered
        const textElement = screen.getByText('Add Media');
        expect(textElement).toBeInTheDocument();

        // Check that the Baby icon is rendered
        const iconElement = document.querySelector('.lucide-baby');
        expect(iconElement).toBeInTheDocument();
    });

    it('calls onClick handler when clicked', () => {
        const mockOnClick = jest.fn();
        render(<Polaroid onClick={mockOnClick} />);

        // Click the button
        const button = screen.getByRole('button', { name: 'Add Media' });
        fireEvent.click(button);

        // Verify the callback was called
        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
}); 