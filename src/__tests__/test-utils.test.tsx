import { render, screen } from './test-utils';
import '@testing-library/jest-dom';

// Simple component for testing the render function
const TestComponent = () => <div>Test Component</div>;

describe('test-utils', () => {
    it('renders a component correctly', () => {
        render(<TestComponent />);
        expect(screen.getByText('Test Component')).toBeInTheDocument();
    });
}); 