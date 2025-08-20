import { render, screen, fireEvent } from '../test-utils';
import PencilIcon from '@/components/PencilIcon';
import '@testing-library/jest-dom';

describe('PencilIcon Component', () => {
    it('renders correctly with image and button', () => {
        const mockOnClick = jest.fn();
        render(<PencilIcon onClick={mockOnClick} />);

        // Check that the image is rendered with correct attributes
        const image = screen.getByAltText('Pencil Icon');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src');

        // Check for the button
        const button = screen.getByRole('button', { name: 'Add doodle' });
        expect(button).toBeInTheDocument();
    });

    it('calls onClick when button is clicked', () => {
        const mockOnClick = jest.fn();
        render(<PencilIcon onClick={mockOnClick} />);

        // Click the button
        const button = screen.getByRole('button', { name: 'Add doodle' });
        fireEvent.click(button);

        // Verify the click handler was called
        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('has correct styling for accessibility', () => {
        const mockOnClick = jest.fn();
        render(<PencilIcon onClick={mockOnClick} />);

        // Main container should have group class for hover effects
        const image = screen.getByAltText('Pencil Icon');
        const imageContainer = image.closest('div');
        const mainContainer = imageContainer?.parentElement;

        expect(mainContainer).not.toBeNull();
        expect(mainContainer).toHaveClass('group');
        expect(mainContainer).toHaveClass('z-10');

        // Button should be transparent but cover the full component for accessibility
        const button = screen.getByRole('button');
        expect(button).toHaveClass('opacity-0');
        expect(button).toHaveClass('absolute');
        expect(button).toHaveClass('inset-0');
    });
}); 