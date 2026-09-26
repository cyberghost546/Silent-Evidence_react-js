import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Crown, PenLine, Zap, Search, User, ArrowUp, ArrowDown, BadgeCheck, Trash2 } from 'lucide-react'
import { getAdminUsers, updateAdminUser, deleteAdminUser } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../Avatar/Avatar'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> USERS (/dashboard/users). Admins only
// (the whole /dashboard is inside <ProtectedRoute adminOnly>, and
// Django checks again: IsAdminUser in dashboard/views.py).
//
//   [ 4 number cards: total / admins / authors / premium ]
//   [ search box ]  (All) (User) (Author) (Admin) (Premium)
//   Showing 2 of 2 users
//   ┌───┬─────┬──────────┬───────┬──────┬───────┬──────────┬────────┬─────────┐
//   │ ☐ │ ID ↑│ User     │ Email │ Role │Stories│ Comments │ Joined │ Actions │
//   └───┴─────┴──────────┴───────┴──────┴───────┴──────────┴────────┴─────────┘
//
// Django sends ALL users once. Searching, filtering and sorting
// happen here in the browser - see `shownUsers` below.
// ---------------------------------------------------------------


// The filter buttons, as data. `test` answers "does this user
// belong in this filter?" - a small function per filter.
const FILTERS = [
    { value: 'all', label: 'All', test: () => true },
    { value: 'user', label: 'User', icon: User, test: user => user.role === 'user' },
    { value: 'author', label: 'Author', icon: PenLine, test: user => user.role === 'author' },
    { value: 'admin', label: 'Admin', icon: Crown, test: user => user.role === 'admin' },
    { value: 'premium', label: 'Premium', test: user => user.is_premium },
]

// The colour of each role, as data (the role dropdown in the table).
const ROLE_STYLES = {
    admin: 'border-red-700 text-red-400',
    author: 'border-blue-700 text-blue-400',
    user: 'border-slate-600 text-gray-300',
}

// The small outlined buttons in the Actions column.
const ACTION_BUTTON = 'whitespace-nowrap rounded-md border px-2.5 py-1 text-xs transition-colors disabled:opacity-40'


// "2026-09-24T10:00:00Z" -> "Sep 24, 2026" (short, so the table fits).
function shortDate(isoString) {
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}


// ---------------------------------------------------------------
// One number card at the top.
//
// Usage:
//   <UserStatCard icon={Users} value={2} label='Total Users' color='text-gray-300' />
// ---------------------------------------------------------------
function UserStatCard({ icon: Icon, value, label, color }) {
    // `icon: Icon` in the props = "take the prop called icon, but call
    // it Icon here" - a capital letter, so JSX sees a component.
    return (
        <div className='flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-5'>
            <Icon className={`h-7 w-7 ${color}`} />
            <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className='text-sm text-gray-500'>{label}</p>
            </div>
        </div>
    )
}


// ---------------------------------------------------------------
// One row of the table.
//
// Props:
//   user       - one user from Django
//   isMe       - the logged-in admin (can't demote/delete themselves)
//   selected   - is its checkbox ticked?
//   onSelect   - tick / untick the checkbox
//   onChange   - (id, { role: 'admin' }) -> save a change
//   onDelete   - (user) -> delete them
// ---------------------------------------------------------------
function UserRow({ user, isMe, selected, onSelect, onChange, onDelete }) {
    return (
        <tr className='border-t border-slate-800 transition-colors hover:bg-slate-800/30'>
            <td className='px-4 py-3.5'>
                {/* accent-red-600 = a red tick. */}
                <input
                    type='checkbox'
                    checked={selected}
                    onChange={onSelect}
                    aria-label={`Select ${user.username}`}
                    className='h-4 w-4 accent-red-600'
                />
            </td>

            <td className='px-2.5 py-3.5'>
                <span className='rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-gray-400'>#{user.id}</span>
            </td>

            {/* ---------- USER: avatar, name, badges ---------- */}
            <td className='px-2.5 py-3.5'>
                <div className='flex items-center gap-3'>
                    <Avatar username={user.username} image={user.avatar} />
                    {/* The name links to their public profile. */}
                    <Link to={`/profile/${user.username}`} className='font-semibold text-white hover:text-red-400'>
                        {user.username}
                    </Link>
                    {user.is_verified && (
                        <BadgeCheck className='h-4 w-4 shrink-0 text-blue-400' aria-label='Verified' />
                    )}
                    {user.is_premium && (
                        <span className='rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-extrabold text-black'>PRO</span>
                    )}
                </div>
            </td>

            {/* max-w + truncate: a long email gets "..." instead of
                making the whole table wider (10rem, or 18rem on very
                wide screens - 2xl:). title = hover to see all of it. */}
            <td className='max-w-[10rem] truncate px-2.5 py-3.5 text-sm text-gray-300 2xl:max-w-[18rem]' title={user.email}>{user.email || '—'}</td>

            {/* ---------- ROLE: a coloured dropdown ---------- */}
            <td className='px-2.5 py-3.5'>
                {/* A normal <select>, styled to look like a pill.
                    Picking another option saves it straight away.
                    Disabled for yourself (see isMe above). */}
                <select
                    value={user.role}
                    onChange={event => onChange(user.id, { role: event.target.value })}
                    disabled={isMe}
                    aria-label={`Role of ${user.username}`}
                    title={isMe ? "You can't change your own role" : undefined}
                    className={`rounded-full border bg-slate-900 px-3 py-1 text-xs font-bold uppercase [color-scheme:dark] focus:outline-none disabled:cursor-not-allowed ${ROLE_STYLES[user.role]}`}
                >
                    <option value='user'>User</option>
                    <option value='author'>Author</option>
                    <option value='admin'>Admin</option>
                </select>
            </td>

            <td className='px-2.5 py-3.5 text-center font-semibold text-white'>{user.story_count}</td>
            <td className='px-2.5 py-3.5 text-center font-semibold text-white'>{user.comment_count}</td>
            <td className='whitespace-nowrap px-2.5 py-3.5 text-sm text-gray-500'>{shortDate(user.date_joined)}</td>

            {/* ---------- ACTIONS ---------- */}
            <td className='px-4 py-3.5'>
                <div className='flex justify-end gap-1.5'>
                    {/* !user.is_verified = the opposite: a toggle. */}
                    <button
                        type='button'
                        onClick={() => onChange(user.id, { is_verified: !user.is_verified })}
                        className={`${ACTION_BUTTON} border-slate-600 text-gray-300 hover:border-slate-400 hover:text-white`}
                    >
                        {user.is_verified ? 'Unverify' : 'Verify'}
                    </button>
                    <button
                        type='button'
                        onClick={() => onChange(user.id, { is_premium: !user.is_premium })}
                        className={`${ACTION_BUTTON} border-yellow-700/70 text-yellow-400 hover:bg-yellow-950/40`}
                    >
                        {user.is_premium ? '− Pro' : '+ Pro'}
                    </button>
                    <button
                        type='button'
                        onClick={() => onDelete(user)}
                        disabled={isMe}
                        title={isMe ? "You can't delete yourself here" : undefined}
                        className={`${ACTION_BUTTON} border-red-800 text-red-400 hover:bg-red-950/60`}
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    )
}


function UsersDashboard() {
    const { user: me } = useAuth()

    // null = loading. Then { counts, users }.
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [sortNewestFirst, setSortNewestFirst] = useState(false)

    // The ids of the ticked checkboxes. A Set = a list where every
    // value can only be in it once - perfect for "is id 5 ticked?".
    const [selected, setSelected] = useState(new Set())

    // Changing this number loads everything again (see useEffect).
    // We reload after every change, so the 4 counts at the top stay
    // right too.
    const [reloadKey, setReloadKey] = useState(0)

    function reload() {
        // The function form: "whatever it is now, plus 1".
        setReloadKey(current => current + 1)
    }

    useEffect(() => {
        getAdminUsers()
            .then(result => setData(result))
            .catch(() => setError('Could not load the users.'))
    }, [reloadKey])


    // ---------- SEARCH + FILTER + SORT (in the browser) ----------
    // Worked out on every render from what we already have - no
    // extra state needed.
    let shownUsers = []
    if (data) {
        const words = search.trim().toLowerCase()
        const filterTest = FILTERS.find(item => item.value === filter).test

        shownUsers = data.users
            // 1. The filter button (All / User / Author...).
            .filter(filterTest)
            // 2. The search box: id, username or email.
            //    String(user.id) because id is a number: 57 -> '57'.
            .filter(user =>
                words === '' ||
                String(user.id).includes(words) ||
                user.username.toLowerCase().includes(words) ||
                user.email.toLowerCase().includes(words)
            )

        // 3. Sort by id. .sort() changes the list it's called on, and
        //    .filter() above already made a new list, so that's safe.
        //    (a, b) => a.id - b.id = smallest first.
        shownUsers.sort((a, b) => (sortNewestFirst ? b.id - a.id : a.id - b.id))
    }


    // ---------- CHANGES ----------
    async function handleChange(id, changes) {
        setError('')
        try {
            await updateAdminUser(id, changes)
            reload()
        } catch (err) {
            // e.g. "You can't remove your own admin role."
            setError(err.data?.detail || 'Could not save that change.')
        }
    }

    async function handleDelete(user) {
        if (!window.confirm(`Delete ${user.username} and everything they wrote? This cannot be undone.`)) return

        try {
            await deleteAdminUser(user.id)
            setNotice(`${user.username} was deleted.`)
            reload()
        } catch (err) {
            setError(err.data?.detail || 'Could not delete that user.')
        }
    }

    // Tick / untick one row. We make a NEW Set (a copy) - React only
    // notices a change when the state is a new object.
    function toggleSelected(id) {
        const next = new Set(selected)
        if (next.has(id)) {
            next.delete(id)
        } else {
            next.add(id)
        }
        setSelected(next)
    }

    // The checkbox in the table header: tick every row that's SHOWN
    // (or untick them all if they're all ticked already).
    // Yourself is left out - you can't delete yourself anyway.
    const selectableIds = shownUsers.filter(user => user.id !== me.id).map(user => user.id)
    const allSelected = selectableIds.length > 0 && selectableIds.every(id => selected.has(id))

    function toggleAll() {
        setSelected(allSelected ? new Set() : new Set(selectableIds))
    }

    async function deleteSelected() {
        const count = selected.size
        if (!window.confirm(`Delete ${count} ${count === 1 ? 'user' : 'users'} and everything they wrote?`)) return

        // Promise.all = send all the deletes at the same time, and
        // wait until every one of them is done.
        try {
            await Promise.all([...selected].map(id => deleteAdminUser(id)))
            setNotice(`${count} ${count === 1 ? 'user' : 'users'} deleted.`)
        } catch {
            setError('Some users could not be deleted.')
        }
        setSelected(new Set())
        reload()
    }


    // ---------- THE PAGE ----------
    if (!data) {
        return <p className='text-gray-400'>{error || 'Loading users...'}</p>
    }

    return (
        <div>
            <h1 className='text-3xl font-bold text-white'>Users</h1>
            <p className='mt-1 text-gray-400'>
                {data.counts.total} registered {data.counts.total === 1 ? 'user' : 'users'}
            </p>

            {/* ---------- 4 NUMBER CARDS ---------- */}
            <div className='mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                <UserStatCard icon={Users} value={data.counts.total} label='Total Users' color='text-gray-200' />
                <UserStatCard icon={Crown} value={data.counts.admins} label='Admins' color='text-red-400' />
                <UserStatCard icon={PenLine} value={data.counts.authors} label='Authors' color='text-blue-400' />
                <UserStatCard icon={Zap} value={data.counts.premium} label='Premium' color='text-yellow-400' />
            </div>

            {/* ---------- SEARCH + FILTER BUTTONS ---------- */}
            <div className='mt-6 flex flex-col gap-3 xl:flex-row xl:items-center'>
                <div className='relative flex-1'>
                    <Search className='pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500' />
                    <input
                        type='search'
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder='Search by ID, username or email...'
                        aria-label='Search users'
                        className='w-full rounded-lg border border-slate-700 bg-slate-900 py-3 pl-11 pr-4 text-white placeholder:text-slate-500 focus:border-red-600 focus:outline-none'
                    />
                </div>

                <div className='flex flex-wrap gap-2'>
                    {FILTERS.map(item => {
                        const Icon = item.icon
                        const isActive = item.value === filter
                        return (
                            <button
                                key={item.value}
                                type='button'
                                onClick={() => setFilter(item.value)}
                                aria-pressed={isActive}
                                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                                    isActive
                                        ? 'border-red-600 bg-red-600 text-white'
                                        : 'border-slate-700 text-gray-300 hover:border-slate-500'
                                } ${item.value === 'all' || item.value === 'premium' ? '' : 'uppercase'}`}
                            >
                                {item.label}
                                {/* Only some filters have an icon. */}
                                {Icon && <Icon className='h-4 w-4' />}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* ---------- MESSAGES ---------- */}
            {error && <p className='mt-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-300'>{error}</p>}
            {notice && <p className='mt-4 rounded-lg border border-green-800 bg-green-950/40 px-4 py-2 text-sm text-green-300'>{notice}</p>}

            {/* ---------- "SHOWING X OF Y" + BULK DELETE ---------- */}
            <div className='mt-5 flex min-h-9 items-center justify-between'>
                <p className='text-sm text-gray-400'>
                    Showing <span className='font-bold text-white'>{shownUsers.length}</span> of {data.counts.total} users
                </p>

                {/* Only when some rows are ticked. */}
                {selected.size > 0 && (
                    <button
                        type='button'
                        onClick={deleteSelected}
                        className='flex items-center gap-2 rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700'
                    >
                        <Trash2 className='h-4 w-4' />
                        Delete {selected.size} selected
                    </button>
                )}
            </div>

            {/* ---------- THE TABLE ---------- */}
            {/* overflow-x-auto: on a small screen the table scrolls
                sideways instead of squashing every column. */}
            <div className='mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40'>
                <table className='w-full min-w-[52rem] text-left'>
                    <thead>
                        <tr className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
                            <th className='px-4 py-3.5'>
                                <input
                                    type='checkbox'
                                    checked={allSelected}
                                    onChange={toggleAll}
                                    aria-label='Select all shown users'
                                    className='h-4 w-4 accent-red-600'
                                />
                            </th>
                            {/* aria-sort tells screen readers how this
                                column is sorted. */}
                            <th className='px-2.5 py-3.5' aria-sort={sortNewestFirst ? 'descending' : 'ascending'}>
                                {/* Click to flip the order. */}
                                <button
                                    type='button'
                                    onClick={() => setSortNewestFirst(!sortNewestFirst)}
                                    className='flex items-center gap-1 uppercase hover:text-white'
                                >
                                    ID
                                    {sortNewestFirst ? <ArrowDown className='h-3.5 w-3.5' /> : <ArrowUp className='h-3.5 w-3.5' />}
                                </button>
                            </th>
                            <th className='px-2.5 py-3.5'>User</th>
                            <th className='px-2.5 py-3.5'>Email</th>
                            <th className='px-2.5 py-3.5'>Role</th>
                            <th className='px-2.5 py-3.5 text-center'>Stories</th>
                            <th className='px-2.5 py-3.5 text-center'>Comments</th>
                            <th className='px-2.5 py-3.5'>Joined</th>
                            <th className='px-4 py-3.5 text-right'>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {shownUsers.map(user => (
                            <UserRow
                                key={user.id}
                                user={user}
                                isMe={user.id === me.id}
                                selected={selected.has(user.id)}
                                onSelect={() => toggleSelected(user.id)}
                                onChange={handleChange}
                                onDelete={handleDelete}
                            />
                        ))}
                    </tbody>
                </table>

                {shownUsers.length === 0 && (
                    <p className='px-5 py-10 text-center text-sm text-gray-500'>No users match this search.</p>
                )}
            </div>
        </div>
    )
}

export default UsersDashboard
