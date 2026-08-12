import { ClipboardCheck, ClipboardList, FileText, FolderOpen, GraduationCap, Hand, LayoutDashboard, Microscope, Pill, Recycle, ShieldCheck, SlidersHorizontal, Syringe, UserCog, Users, UsersRound, Waves, ScanLine, Sparkles } from 'lucide-react'
import { APP_ROUTES } from '../config/routes'

/** Single navigation source. Keep functional areas grouped and predictable. */
export const navigation = [{
  id:'healthcare-suite', label:'Healthcare Suite', items:[
    {id:'dashboard',labelKey:'nav.dashboard',path:APP_ROUTES.DASHBOARD,icon:LayoutDashboard},
    {id:'laboratory',labelKey:'nav.laboratory',path:APP_ROUTES.LABORATORY,icon:Microscope},
    {id:'surveillance',labelKey:'nav.surveillance',icon:ClipboardList,children:[
      {id:'patients',labelKey:'nav.patients',path:APP_ROUTES.PATIENTS,icon:Users},
      {id:'employees',labelKey:'nav.employees',path:APP_ROUTES.EMPLOYEES,icon:UserCog},
      {id:'water',labelKey:'nav.water',path:`${APP_ROUTES.LABORATORY}/water`,icon:Waves},
      {id:'surfaces',labelKey:'nav.surfaces',path:`${APP_ROUTES.LABORATORY}/environment`,icon:ScanLine},
      {id:'notifiable-diseases',labelKey:'nav.notifiableDiseases',path:APP_ROUTES.NOTIFIABLE_DISEASES,icon:FileText},
    ]},
    {id:'prevention',labelKey:'nav.prevention',icon:ShieldCheck,children:[
      {id:'hand-hygiene',labelKey:'nav.handHygiene',path:APP_ROUTES.HAND_HYGIENE,icon:Hand},
      {id:'vaccinations',labelKey:'nav.vaccinations',path:APP_ROUTES.VACCINATIONS,icon:Syringe},
      {id:'promoted-antibiotics',labelKey:'nav.promotedAntibiotics',path:APP_ROUTES.PROMOTED_ANTIBIOTICS,icon:Pill},
    ]},
    {id:'records',labelKey:'nav.records',icon:ClipboardList,children:[
      {id:'antiseptics',labelKey:'nav.antiseptics',path:APP_ROUTES.ANTISEPTIC_CONSUMPTION,icon:Pill},
      {id:'waste',labelKey:'nav.waste',path:APP_ROUTES.WASTE,icon:Recycle},
    ]},
    {id:'quality',labelKey:'nav.quality',path:APP_ROUTES.QUALITY,icon:ClipboardCheck},
    {id:'committees',labelKey:'nav.committees',path:APP_ROUTES.COMMITTEES,icon:UsersRound},
    {id:'training',labelKey:'nav.training',path:APP_ROUTES.TRAINING,icon:GraduationCap},
    {id:'documents',labelKey:'nav.documents',path:APP_ROUTES.DOCUMENTS,icon:FolderOpen},
    {id:'lira',labelKey:'nav.lira',path:APP_ROUTES.LIRA,icon:Sparkles},
    {id:'administration-center',labelKey:'nav.studio',path:APP_ROUTES.STUDIO,icon:SlidersHorizontal,emphasis:true},
  ]
}]
