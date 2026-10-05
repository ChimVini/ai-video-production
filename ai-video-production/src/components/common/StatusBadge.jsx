import React from 'react';
import { STATUS_COLORS, formatStatus } from '../../utils/helpers';

export default function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || 'badge-gray';
  return (
    <span className={`badge ${color}`}>
      {formatStatus(status)}
    </span>
  );
}
