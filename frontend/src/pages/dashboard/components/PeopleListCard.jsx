import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import UserAvatar from '../../../commoncomponents/UserAvatar';

const PAGE_SIZE = 5;

export default function PeopleListCard({ title, people = [], isSuperAdmin = false }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(people.length / PAGE_SIZE));
  const slice = people.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="rounded-lg border border-border bg-surface-card p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        <span className="text-xs text-text-secondary">{people.length} total</span>
      </div>

      {people.length === 0 ? (
        <p className="text-xs text-text-secondary">No data</p>
      ) : (
        <>
          <div className="flex-1 space-y-2">
            {slice.map((person, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <UserAvatar seed={person.user_email} name={person.user_name} size={28} />
                <div className="min-w-0 flex-1">
                  {isSuperAdmin ? (
                    <Link
                      to={`/users/${person.user_id}`}
                      className="text-sm font-medium text-primary-600 hover:underline truncate block"
                    >
                      {person.user_name} {person.user_lastname}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-text-primary truncate">
                      {person.user_name} {person.user_lastname}
                    </p>
                  )}
                </div>
                <span className="ml-auto shrink-0 text-xs font-semibold text-text-primary">
                  {person.project_count} <span className="font-normal text-text-secondary">proj</span>
                </span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded p-0.5 text-text-secondary hover:text-text-primary disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-text-secondary">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded p-0.5 text-text-secondary hover:text-text-primary disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
