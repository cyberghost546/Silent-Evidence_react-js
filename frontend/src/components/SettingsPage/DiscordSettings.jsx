import { DiscordIcon } from '../BrandIcons/BrandIcons'
import { SettingsSection, ComingSoon } from './SettingsParts'


// ---------------------------------------------------------------
// "Discord" - shown, but switched off for now.
//
// Connecting a Discord account needs "Log in with Discord" (OAuth):
// a Discord developer app, a client id + secret in Django, and a
// view that Discord sends the user back to. That's a project of its
// own, so the button is disabled until then.
// ---------------------------------------------------------------
function DiscordSettings() {
    return (
        <SettingsSection id='discord' title='Discord' description='Connect your Discord account to join the community server.'>
            <div className='rounded-xl border border-slate-800 bg-slate-900 p-5'>
                <div className='flex items-start gap-3'>
                    {/* text-[#5865F2] = Discord's own purple-blue. */}
                    <DiscordIcon className='mt-0.5 h-6 w-6 text-[#5865F2]' />
                    <div>
                        <p className='flex items-center gap-2 font-semibold text-white'>
                            Discord <ComingSoon />
                        </p>
                        <p className='text-xs text-gray-400'>Connect to get your role in the community server.</p>
                    </div>
                </div>

                <button
                    type='button'
                    disabled
                    className='mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#5865F2] py-3 font-bold text-white transition-colors hover:bg-[#4752c4] disabled:cursor-not-allowed disabled:opacity-50'
                >
                    <DiscordIcon className='h-5 w-5' />
                    Connect Discord
                </button>
            </div>
        </SettingsSection>
    )
}

export default DiscordSettings
