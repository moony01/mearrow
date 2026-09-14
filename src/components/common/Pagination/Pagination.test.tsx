import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './index';

function renderPagination(currentPage = 1, totalPages = 23) {
  const onPageChange = vi.fn();

  const view = render(
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      ariaLabel="뉴스 페이지 탐색"
      previousGroupLabel="이전 5페이지 묶음"
      previousLabel="이전 페이지"
      nextLabel="다음 페이지"
      nextGroupLabel="다음 5페이지 묶음"
      pageLabel={(page) => `${page}페이지`}
    />,
  );

  return { ...view, onPageChange };
}

describe('Pagination', () => {
  it('shows five-page windows and jumps between windows', () => {
    const { onPageChange, rerender } = renderPagination();

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '<<',
      '<',
      '1',
      '2',
      '3',
      '4',
      '5',
      '>',
      '>>',
    ]);
    expect(screen.queryByRole('button', { name: '6페이지' })).toBeNull();
    expect((screen.getByRole('button', { name: '이전 5페이지 묶음' }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    fireEvent.click(screen.getByRole('button', { name: '다음 5페이지 묶음' }));
    expect(onPageChange).toHaveBeenCalledWith(6);

    rerender(
      <Pagination
        currentPage={6}
        totalPages={23}
        onPageChange={onPageChange}
        ariaLabel="뉴스 페이지 탐색"
        previousGroupLabel="이전 5페이지 묶음"
        previousLabel="이전 페이지"
        nextLabel="다음 페이지"
        nextGroupLabel="다음 5페이지 묶음"
        pageLabel={(page) => `${page}페이지`}
      />,
    );

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '<<',
      '<',
      '6',
      '7',
      '8',
      '9',
      '10',
      '>',
      '>>',
    ]);
    fireEvent.click(screen.getByRole('button', { name: '이전 5페이지 묶음' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it('disables page controls at the end of the final window', () => {
    renderPagination(23);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '<<',
      '<',
      '21',
      '22',
      '23',
      '>',
      '>>',
    ]);
    expect((screen.getByRole('button', { name: '다음 페이지' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '다음 5페이지 묶음' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole('button', { name: '이전 5페이지 묶음' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });
});
