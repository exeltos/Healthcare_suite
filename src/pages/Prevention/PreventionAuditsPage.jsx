import PreventionRecordsPage from '../../components/prevention/PreventionRecordsPage'
import { loadPreventionAudits, PREVENTION_AUDITS_EVENT } from '../../services/preventionService'
import { deletePreventionRecord, savePreventionRecord } from '../../services/backend/preventionBackendService'

export default function PreventionAuditsPage(){
  return <PreventionRecordsPage
    title="Έλεγχοι Πρόληψης"
    titleEn="Prevention Audits"
    description="Προγραμματισμένοι και έκτακτοι έλεγχοι συμμόρφωσης με μέτρα πρόληψης."
    descriptionEn="Scheduled and ad-hoc audits of compliance with prevention measures."
    fields={[
      {id:'date',label:'Ημερομηνία',labelEn:'Date',type:'date',required:true},
      {id:'department',label:'Τμήμα',labelEn:'Department',libraryKey:'departments',required:true},
      {id:'auditType',label:'Τύπος ελέγχου',labelEn:'Audit type',libraryKey:'audit-types',required:true},
      {id:'auditor',label:'Ελεγκτής',labelEn:'Auditor'},
      {id:'score',label:'Βαθμολογία %',labelEn:'Score %',type:'number',min:0,max:100,rangeMessage:'Η βαθμολογία πρέπει να είναι από 0 έως 100'},
      {id:'findings',label:'Ευρήματα',labelEn:'Findings',type:'textarea'},
      {id:'correctiveAction',label:'Διορθωτική ενέργεια',labelEn:'Corrective action',type:'textarea'},
      {id:'dueDate',label:'Προθεσμία',labelEn:'Due date',type:'date'},
      {id:'status',label:'Κατάσταση',labelEn:'Status',type:'select',options:[
        {value:'Ανοικτό',label:'Ανοικτό',labelEn:'Open'},
        {value:'Σε εξέλιξη',label:'Σε εξέλιξη',labelEn:'In progress'},
        {value:'Ολοκληρωμένο',label:'Ολοκληρωμένο',labelEn:'Completed'},
      ]},
    ]}
    columns={[
      {key:'date',label:'Ημερομηνία',labelEn:'Date'},
      {key:'department',label:'Τμήμα',labelEn:'Department'},
      {key:'auditType',label:'Έλεγχος',labelEn:'Audit'},
      {key:'score',label:'Βαθμολογία %',labelEn:'Score %'},
      {key:'status',label:'Κατάσταση',labelEn:'Status'},
    ]}
    loadRecords={loadPreventionAudits}
    upsertRecord={(record)=>savePreventionRecord('prevention_audit',record)}
    deleteRecord={(id)=>deletePreventionRecord('prevention_audit',id)}
    eventName={PREVENTION_AUDITS_EVENT}
    emptyRecord={{date:'',department:'',auditType:'',auditor:'',score:'',findings:'',correctiveAction:'',dueDate:'',status:'Ανοικτό'}}
    idPrefix="AUD"
  />
}
