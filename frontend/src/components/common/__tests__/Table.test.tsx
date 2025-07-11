import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Table from '../Table';

interface TestData {
  id: number;
  name: string;
  email: string;
  status: string;
}

const mockData: TestData[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
];

const mockColumns = [
  { key: 'id', header: 'ID', sortable: true },
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email' },
  { key: 'status', header: 'Status', sortable: true },
];

describe('Table Component', () => {
  const defaultProps = {
    data: mockData,
    columns: mockColumns,
  };

  it('renders table with data', () => {
    render(<Table {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<Table {...defaultProps} />);
    
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('handles sorting when sortable is true', () => {
    render(<Table {...defaultProps} sortable />);
    
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    
    // Check if sort icon appears
    expect(screen.getByText('↑')).toBeInTheDocument();
  });

  it('changes sort direction on second click', () => {
    render(<Table {...defaultProps} sortable />);
    
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    fireEvent.click(nameHeader);
    
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('renders pagination when enabled', () => {
    render(<Table {...defaultProps} pagination pageSize={2} />);
    
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('handles page navigation', () => {
    render(<Table {...defaultProps} pagination pageSize={2} />);
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });

  it('calls onRowClick when row is clicked', () => {
    const onRowClick = jest.fn();
    render(<Table {...defaultProps} onRowClick={onRowClick} />);
    
    const row = screen.getByText('John Doe').closest('tr');
    fireEvent.click(row!);
    
    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('renders selectable rows when selectable is true', () => {
    render(<Table {...defaultProps} selectable />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(mockData.length + 1); // +1 for select all
  });

  it('handles row selection', () => {
    const onSelectionChange = jest.fn();
    render(
      <Table 
        {...defaultProps} 
        selectable 
        onSelectionChange={onSelectionChange}
      />
    );
    
    const firstRowCheckbox = screen.getAllByRole('checkbox')[1]; // Skip select all
    fireEvent.click(firstRowCheckbox);
    
    expect(onSelectionChange).toHaveBeenCalledWith([mockData[0]]);
  });

  it('handles select all functionality', () => {
    const onSelectionChange = jest.fn();
    render(
      <Table 
        {...defaultProps} 
        selectable 
        onSelectionChange={onSelectionChange}
      />
    );
    
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);
    
    expect(onSelectionChange).toHaveBeenCalledWith(mockData);
  });

  it('renders loading state', () => {
    render(<Table {...defaultProps} loading />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders empty message when no data', () => {
    render(<Table data={[]} columns={mockColumns} />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders custom empty message', () => {
    render(
      <Table 
        data={[]} 
        columns={mockColumns} 
        emptyMessage="No records found"
      />
    );
    
    expect(screen.getByText('No records found')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <Table {...defaultProps} className="custom-table" />
    );
    
    expect(container.firstChild).toHaveClass('custom-table');
  });

  it('renders custom cell content with render function', () => {
    const columnsWithRender = [
      ...mockColumns,
      {
        key: 'status',
        header: 'Status',
        render: (value: string) => (
          <span data-testid={`status-${value}`}>{value}</span>
        ),
      },
    ];

    render(<Table data={mockData} columns={columnsWithRender} />);
    
    expect(screen.getByTestId('status-Active')).toBeInTheDocument();
  });
}); 