import { BarChart3, ClipboardCheck, ClipboardList, FileText, FolderOpen, GraduationCap, Hand, LayoutDashboard, Microscope, Pill, Recycle, ShieldCheck, SlidersHorizontal, Syringe, UserCog, Users, UsersRound, Waves, ScanLine, Sparkles } from 'lucide-react'
import { APP_ROUTES } from '../config/routes'
import { MODULES } from '../services/accessControlService'

/** Single navigation source. Keep functional areas grouped and predictable. */
export const navigation = [{
  id:'healthcare-suite', label:'Healthcare Suite', items:[
    {id:'dashboard',moduleKey:MODULES.DASHBOARD,labelKey:'nav.dashboard',path:APP_ROUTES.DASHBOARD,icon:LayoutDashboard},
    {id:'laboratory',moduleKey:MODULES.LABORATORY,labelKey:'nav.laboratory',path:APP_ROUTES.LABORATORY,icon:Microscope},
    {id:'surveillance',labelKey:'nav.surveillance',icon:ClipboardList,children:[
      {id:'patients',moduleKey:MODULES.PATIENTS,labelKey:'nav.patients',path:APP_ROUTES.PATIENTS,icon:Users},
      {id:'employees',moduleKey:MODULES.EMPLOYEES,labelKey:'nav.employees',path:APP_ROUTES.EMPLOYEES,icon:UserCog},
      {id:'water',moduleKey:MODULES.WATER,labelKey:'nav.water',path:APP_ROUTES.LABORATORY_WATER,icon:Waves},
      {id:'surfaces',moduleKey:MODULES.SURFACES,labelKey:'nav.surfaces',path:APP_ROUTES.LABORATORY_ENVIRONMENT,icon:ScanLine},
    ]},
    {id:'prevention',labelKey:'nav.prevention',icon:ShieldCheck,children:[
      {id:'hand-hygiene',moduleKey:MODULES.HAND_HYGIENE,labelKey:'nav.handHygiene',path:APP_ROUTES.HAND_HYGIENE,icon:Hand},
      {id:'vaccinations',moduleKey:MODULES.VACCINATIONS,labelKey:'nav.vaccinations',path:APP_ROUTES.VACCINATIONS,icon:Syringe},
    ]},
    {id:'records',labelKey:'nav.records',icon:ClipboardList,children:[
      {id:'antimicrobial-surveillance',moduleKey:MODULES.PROMOTED_ANTIBIOTICS,labelKey:'nav.antimicrobialSurveillance',path:APP_ROUTES.PROMOTED_ANTIBIOTICS,matchPaths:[APP_ROUTES.PROMOTED_ANTIBIOTICS,APP_ROUTES.ANTIMICROBIAL_CONSUMPTION],icon:BarChart3},
      {id:'notifiable-diseases',moduleKey:MODULES.NOTIFIABLE,labelKey:'nav.notifiableDiseases',path:APP_ROUTES.NOTIFIABLE_DISEASES,icon:FileText},
      {id:'antiseptics',moduleKey:MODULES.ANTISEPTICS_WASTE,labelKey:'nav.antiseptics',path:APP_ROUTES.ANTISEPTIC_CONSUMPTION,icon:Pill},
      {id:'waste',moduleKey:MODULES.ANTISEPTICS_WASTE,labelKey:'nav.waste',path:APP_ROUTES.WASTE,icon:Recycle},
    ]},
    {id:'quality',moduleKey:MODULES.QUALITY,labelKey:'nav.quality',path:APP_ROUTES.QUALITY,icon:ClipboardCheck},
    {id:'committees',moduleKey:MODULES.COMMITTEES,labelKey:'nav.committees',path:APP_ROUTES.COMMITTEES,icon:UsersRound},
    {id:'training',moduleKey:MODULES.TRAINING,labelKey:'nav.training',path:APP_ROUTES.TRAINING,icon:GraduationCap},
    {id:'documents',moduleKey:MODULES.DOCUMENTS,labelKey:'nav.documents',path:APP_ROUTES.DOCUMENTS,icon:FolderOpen},
    {id:'lira',moduleKey:MODULES.LIRA,labelKey:'nav.lira',path:APP_ROUTES.LIRA,icon:Sparkles},
    {id:'administration-center',moduleKey:MODULES.STUDIO,labelKey:'nav.studio',path:APP_ROUTES.STUDIO,icon:SlidersHorizontal,emphasis:true},
  ]
}]
