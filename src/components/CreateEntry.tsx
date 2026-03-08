import React from 'react';

export default function CreateEntry({ onNavigate }: { onNavigate: (s: string) => void }) {
  return (
    <div className="flex flex-col min-h-screen bg-background-dark">
      <div className="flex items-center p-4 pb-2 justify-between sticky top-0 bg-background-dark z-10 max-w-md mx-auto w-full">
        <div onClick={() => onNavigate('dashboard')} className="text-slate-100 flex size-12 shrink-0 items-center justify-start cursor-pointer">
          <span className="material-symbols-outlined">close</span>
        </div>
        <h2 className="text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">New Entry</h2>
        <div onClick={() => onNavigate('dashboard')} className="flex w-12 items-center justify-end cursor-pointer">
          <p className="text-primary text-base font-bold leading-normal tracking-[0.015em] shrink-0">Save</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-4 py-4 max-w-md mx-auto w-full">
        <label className="flex flex-col w-full">
          <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">Plan Name</p>
          <input className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 placeholder:text-primary/40 p-4 text-base font-normal leading-normal" placeholder="e.g., Grocery Shopping" type="text"/>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col">
            <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">Date</p>
            <input className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 p-4 text-base font-normal" type="date" defaultValue="2023-10-27"/>
          </label>
          <label className="flex flex-col">
            <p className="text-slate-100 text-sm font-semibold leading-normal pb-2">Puntos</p>
            <input className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-14 p-4 text-base font-normal" placeholder="50" type="number"/>
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-slate-100 text-sm font-semibold leading-normal">Priority</p>
          <div className="flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1">
            <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-background-dark has-[:checked]:shadow-sm text-primary/60 has-[:checked]:text-primary text-sm font-bold transition-all">
              <span className="truncate">Critical</span>
              <input defaultChecked className="invisible w-0" name="priority" type="radio" value="Critical"/>
            </label>
            <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-background-dark has-[:checked]:shadow-sm text-primary/60 has-[:checked]:text-primary text-sm font-bold transition-all">
              <span className="truncate">Flexible</span>
              <input className="invisible w-0" name="priority" type="radio" value="Flexible"/>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-slate-100 text-base font-bold leading-tight">Recurring</p>
              <p className="text-primary/60 text-sm font-normal leading-normal">Repeat this task automatically</p>
            </div>
            <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none bg-primary/20 p-0.5 has-[:checked]:justify-end has-[:checked]:bg-primary transition-all duration-200">
              <div className="h-full w-[27px] rounded-full bg-white shadow-md"></div>
              <input defaultChecked className="invisible absolute" type="checkbox"/>
            </label>
          </div>
          <div className="mt-2">
            <p className="text-slate-100 text-sm font-semibold leading-normal pb-3">Frequency</p>
            <div className="flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1">
              <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-background-dark has-[:checked]:shadow-sm text-primary/60 has-[:checked]:text-primary text-sm font-bold transition-all">
                <span className="truncate">Daily</span>
                <input className="invisible w-0" name="frequency" type="radio" value="Daily"/>
              </label>
              <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-background-dark has-[:checked]:shadow-sm text-primary/60 has-[:checked]:text-primary text-sm font-bold transition-all">
                <span className="truncate">Weekly</span>
                <input defaultChecked className="invisible w-0" name="frequency" type="radio" value="Weekly"/>
              </label>
              <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-background-dark has-[:checked]:shadow-sm text-primary/60 has-[:checked]:text-primary text-sm font-bold transition-all">
                <span className="truncate">Monthly</span>
                <input className="invisible w-0" name="frequency" type="radio" value="Monthly"/>
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-1">
          <p className="text-slate-100 text-sm font-semibold leading-normal">Type</p>
          <div className="flex h-11 items-center justify-center rounded-xl bg-primary/10 p-1">
            <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-background-dark has-[:checked]:shadow-sm text-primary/60 has-[:checked]:text-primary text-sm font-bold transition-all">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span className="truncate">Task</span>
              </div>
              <input defaultChecked className="invisible w-0" name="entry_type" type="radio" value="Task"/>
            </label>
            <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-background-dark has-[:checked]:shadow-sm text-primary/60 has-[:checked]:text-primary text-sm font-bold transition-all">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">calendar_today</span>
                <span className="truncate">Event</span>
              </div>
              <input className="invisible w-0" name="entry_type" type="radio" value="Event"/>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-slate-100 text-sm font-semibold leading-normal">Assignment Type</p>
          <div className="grid grid-cols-1 gap-3">
            <label className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
              <input defaultChecked className="w-5 h-5 text-primary focus:ring-primary border-primary/40 bg-transparent" name="assignment" type="radio"/>
              <div className="flex flex-col">
                <span className="text-sm font-bold">Strict Rotation</span>
                <span className="text-xs text-primary/60">Alternate turns every cycle</span>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
              <input className="w-5 h-5 text-primary focus:ring-primary border-primary/40 bg-transparent" name="assignment" type="radio"/>
              <div className="flex flex-col">
                <span className="text-sm font-bold">Team Work</span>
                <span className="text-xs text-primary/60">Collaborate together</span>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
              <input className="w-5 h-5 text-primary focus:ring-primary border-primary/40 bg-transparent" name="assignment" type="radio"/>
              <div className="flex flex-col">
                <span className="text-sm font-bold">Individual</span>
                <span className="text-xs text-primary/60">Assign to one person</span>
              </div>
            </label>
          </div>
        </div>

        <label className="flex flex-col w-full pb-8">
          <div className="flex items-center gap-2 pb-2">
            <span className="material-symbols-outlined text-primary text-sm">description</span>
            <p className="text-slate-100 text-sm font-semibold leading-normal">Description</p>
          </div>
          <textarea className="flex w-full rounded-xl text-slate-100 focus:outline-0 focus:ring-1 focus:ring-primary border border-primary/20 bg-primary/5 h-32 placeholder:text-primary/40 p-4 text-base font-normal leading-normal resize-none" placeholder="Add specific instructions or a description..."></textarea>
        </label>
      </div>
    </div>
  );
}
