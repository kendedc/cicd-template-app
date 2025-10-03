/* eslint-env jest */
/* global describe, it, expect */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AzurePipelineCustomizerWithParameters from './App';

describe('AzurePipelineCustomizerWithParameters', () => {
  it('renders the main heading', () => {
    render(<AzurePipelineCustomizerWithParameters />);
    expect(screen.getByText(/Azure Pipelines customizer \(parameters\)/i)).toBeInTheDocument();
  });

  it('renders project name input', () => {
    render(<AzurePipelineCustomizerWithParameters />);
    expect(screen.getByLabelText(/Project name/i)).toBeInTheDocument();
  });

  it('can type in project name input', () => {
    render(<AzurePipelineCustomizerWithParameters />);
    const input = screen.getByLabelText(/Project name/i);
    fireEvent.change(input, { target: { value: 'MyProject' } });
    expect(input.value).toBe('MyProject');
  });
});
