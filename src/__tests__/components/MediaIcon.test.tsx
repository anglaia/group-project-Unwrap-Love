import { render, screen, fireEvent } from '../test-utils';
import MediaIcon from '@/components/MediaIcon';
import '@testing-library/jest-dom';

describe('MediaIcon Component', () => {
    it('renders correctly', () => {
        const mockOnAddMedia = jest.fn();
        render(<MediaIcon onAddMedia={mockOnAddMedia} />);

        // Check image is rendered with correct attributes
        const image = screen.getByAltText('CD');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src');
    });

    it('calls onAddMedia when clicked', () => {
        const mockOnAddMedia = jest.fn();
        render(<MediaIcon onAddMedia={mockOnAddMedia} />);

        // Find the clickable div and click it directly
        const clickableDiv = screen.getByRole('img', { name: 'CD' }).parentElement;
        if (clickableDiv) {
            fireEvent.click(clickableDiv);
            // Verify the callback was called
            expect(mockOnAddMedia).toHaveBeenCalledTimes(1);
        }
    });
}); 