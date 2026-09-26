import { Search } from 'lucide-react'


// ---------------------------------------------------------------
// Pieces that EVERY admin list page uses (Users, Stories...).
// Written once here, so all admin pages look and work the same.
//
//   <AdminSearch>   the wide search box with the magnifying glass
//   <AdminFilters>  the round filter buttons: (All) (Draft) ...
//   <PageMessages>  the red error / green "done" bars
// ---------------------------------------------------------------


// ---------------------------------------------------------------
// The search box.
//
// Usage:
//   const [search, setSearch] = useState('')
//   <AdminSearch value={search} onChange={setSearch} placeholder='Search by title...' />
//
// Controlled: the PAGE keeps the text, this only shows it.
// ---------------------------------------------------------------
export function AdminSearch({ value, onChange, placeholder }) {
    return (
        <div className='relative flex-1'>
            <Search className='pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500' />
            <input
                type='search'
                value={value}
                // We pass on only the TEXT, not the whole event, so the
                // page can simply write onChange={setSearch}.
                onChange={event => onChange(event.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className='w-full rounded-lg border border-slate-700 bg-slate-900 py-3 pl-11 pr-4 text-white placeholder:text-slate-500 focus:border-red-600 focus:outline-none'
            />
        </div>
    )
}


// ---------------------------------------------------------------
// The round filter buttons.
//
// Usage:
//   const FILTERS = [
//       { value: 'all', label: 'All' },
//       { value: 'draft', label: 'Draft', icon: PenLine },   // icon is optional
//   ]
//   <AdminFilters filters={FILTERS} value={filter} onChange={setFilter} />
//
// Each filter can have more keys (like `test` on the Users page) -
// this component just ignores them.
// ---------------------------------------------------------------
export function AdminFilters({ filters, value, onChange }) {
    return (
        <div className='flex flex-wrap gap-2'>
            {filters.map(item => {
                const Icon = item.icon
                const isActive = item.value === value

                return (
                    <button
                        key={item.value}
                        type='button'
                        onClick={() => onChange(item.value)}
                        aria-pressed={isActive}
                        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                            isActive
                                ? 'border-red-600 bg-red-600 text-white'
                                : 'border-slate-700 text-gray-300 hover:border-slate-500'
                        }`}
                    >
                        {item.label}
                        {Icon && <Icon className='h-4 w-4' />}
                    </button>
                )
            })}
        </div>
    )
}


// ---------------------------------------------------------------
// The red error bar and the green "done" bar. Each only shows when
// it has text.
//
// Usage:
//   <PageMessages error={error} notice={notice} />
// ---------------------------------------------------------------
export function PageMessages({ error, notice }) {
    return (
        <>
            {error && <p className='mt-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-300'>{error}</p>}
            {notice && <p className='mt-4 rounded-lg border border-green-800 bg-green-950/40 px-4 py-2 text-sm text-green-300'>{notice}</p>}
        </>
    )
}
