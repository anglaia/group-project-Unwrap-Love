import { render, screen, fireEvent } from '../test-utils';
import BrushIcon from '@/components/BrushIcon';
import '@testing-library/jest-dom';

describe('BrushIcon Component', () => {
    it('renders correctly with image and button', () => {
        const mockOnClick = jest.fn();
        render(<BrushIcon onClick={mockOnClick} />);

        // Check image is rendered with correct attributes
        const image = screen.getByAltText('Brush');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src');

        // Check button is present and accessible
        const button = screen.getByRole('button', { name: 'Use brush' });
        expect(button).toBeInTheDocument();
    });

    it('calls onClick when button is clicked', () => {
        const mockOnClick = jest.fn();
        render(<BrushIcon onClick={mockOnClick} />);

        // Click the button
        const button = screen.getByRole('button', { name: 'Use brush' });
        fireEvent.click(button);

        // Verify the click handler was called
        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('has proper styling classes for animation and interactivity', () => {
        const mockOnClick = jest.fn();
        render(<BrushIcon onClick={mockOnClick} />);

        // Check main container has expected classes
        const mainContainer = screen.getByAltText('Brush').closest('div')?.parentElement;
        expect(mainContainer).toHaveClass('group');
        expect(mainContainer).toHaveClass('z-10');
        expect(mainContainer).toHaveClass('transform');

        // Verify image container has animation classes
        const imageContainer = screen.getByAltText('Brush').closest('div');
        expect(imageContainer).toHaveClass('relative');
        expect(imageContainer).toHaveClass('transition-all');

        // Verify button is invisible but covers the component
        const button = screen.getByRole('button');
        expect(button).toHaveClass('absolute');
        expect(button).toHaveClass('inset-0');
        expect(button).toHaveClass('opacity-0');
    });
}); 