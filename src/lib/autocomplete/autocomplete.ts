/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  AfterContentInit,
  Component,
  ContentChildren,
  ElementRef,
  Input,
  QueryList,
  TemplateRef,
  ViewChild,
  ViewEncapsulation,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  EventEmitter,
  Output,
  InjectionToken,
  Inject,
  Optional,
} from '@angular/core';
import {
  MatOption,
  MatOptgroup,
  MAT_OPTION_PARENT_COMPONENT,
  mixinDisableRipple,
  CanDisableRipple,
} from '@angular/material/core';
import {ActiveDescendantKeyManager} from '@angular/cdk/a11y';
import {coerceBooleanProperty} from '@angular/cdk/coercion';


/**
 * Autocomplete IDs need to be unique across components, so this counter exists outside of
 * the component definition.
 */
let _uniqueAutocompleteIdCounter = 0;

/** Event object that is emitted when an autocomplete option is selected. */
export class MatAutocompleteSelectedEvent {
  constructor(
    /** Reference to the autocomplete panel that emitted the event. */
    public source: MatAutocomplete,
    /** Option that was selected. */
    public option: MatOption) { }
}

// Boilerplate for applying mixins to MatAutocomplete.
/** @docs-private */
export class MatAutocompleteBase {}
export const _MatAutocompleteMixinBase = mixinDisableRipple(MatAutocompleteBase);

/** Default `mat-autocomplete` options that can be overridden. */
export interface MatAutocompleteDefaultOptions {
  /** Whether the first option should be highlighted when an autocomplete panel is opened. */
  autoActiveFirstOption?: boolean;
}

/** Injection token to be used to override the default options for `mat-autocomplete`. */
export const MAT_AUTOCOMPLETE_DEFAULT_OPTIONS =
    new InjectionToken<MatAutocompleteDefaultOptions>('mat-autocomplete-default-options');


@Component({
  moduleId: module.id,
  selector: 'mat-autocomplete',
  templateUrl: 'autocomplete.html',
  styleUrls: ['autocomplete.css'],
  encapsulation: ViewEncapsulation.None,
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'matAutocomplete',
  inputs: ['disableRipple'],
  host: {
    'class': 'mat-autocomplete'
  },
  providers: [
    {provide: MAT_OPTION_PARENT_COMPONENT, useExisting: MatAutocomplete}
  ]
})
export class MatAutocomplete extends _MatAutocompleteMixinBase implements AfterContentInit,
  CanDisableRipple {

  /** Manages active item in option list based on key events. */
  _keyManager: ActiveDescendantKeyManager<MatOption>;

  /** Whether the autocomplete panel should be visible, depending on option length. */
  showPanel: boolean = false;

  /** Whether the autocomplete panel is open. */
  get isOpen(): boolean { return this._isOpen && this.showPanel; }
  _isOpen: boolean = false;

  /** @docs-private */
  @ViewChild(TemplateRef) template: TemplateRef<any>;

  /** Element for the panel containing the autocomplete options. */
  @ViewChild('panel') panel: ElementRef;

  /** @docs-private */
  @ContentChildren(MatOption, { descendants: true }) options: QueryList<MatOption>;

  /** @docs-private */
  @ContentChildren(MatOptgroup) optionGroups: QueryList<MatOptgroup>;

  /** Function that maps an option's control value to its display value in the trigger. */
  @Input() displayWith: ((value: any) => string) | null = null;

  /**
   * Whether the first option should be highlighted when the autocomplete panel is opened.
   * Can be configured globally through the `MAT_AUTOCOMPLETE_DEFAULT_OPTIONS` token.
   */
  @Input()
  get autoActiveFirstOption(): boolean { return this._autoActiveFirstOption; }
  set autoActiveFirstOption(value: boolean) {
    this._autoActiveFirstOption = coerceBooleanProperty(value);
  }
  private _autoActiveFirstOption: boolean;
  
  /** 
   * @FNB: 
   * If we use the autocomplete by component with detached change detection or its child then set this input to true 
   * in order to trigger detectChanges() when view should be updated.
   * */
  @Input('matAutocompleteSelfChangeDetection') selfChangeDetection = false;


  /** Event that is emitted whenever an option from the list is selected. */
  @Output() readonly optionSelected: EventEmitter<MatAutocompleteSelectedEvent> =
      new EventEmitter<MatAutocompleteSelectedEvent>();
      
  /** Event that is emitted when the autocomplete panel is opened. */
  @Output() readonly opened: EventEmitter<void> = new EventEmitter<void>();
  
  /** Event that is emitted when the autocomplete panel is closed. */
  @Output() readonly closed: EventEmitter<void> = new EventEmitter<void>();
  
  /**
   * Takes classes set on the host mat-autocomplete element and applies them to the panel
   * inside the overlay container to allow for easy styling.
   */
  @Input('class')
  set classList(value: string) {
    if (value && value.length) {
      value.split(' ').forEach(className => this._classList[className.trim()] = true);
      this._elementRef.nativeElement.className = '';
    }
  }
  _classList: {[key: string]: boolean} = {};

  /** Unique ID to be used by autocomplete trigger's "aria-owns" property. */
  id: string = `mat-autocomplete-${_uniqueAutocompleteIdCounter++}`;

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _elementRef: ElementRef,

    // @deletion-target Turn into required param in 6.0.0
    @Optional() @Inject(MAT_AUTOCOMPLETE_DEFAULT_OPTIONS)
        defaults?: MatAutocompleteDefaultOptions) {
    super();

    this._autoActiveFirstOption = defaults &&
        typeof defaults.autoActiveFirstOption !== 'undefined' ?
            defaults.autoActiveFirstOption :
            false;
  }

  ngAfterContentInit() {
    this._keyManager = new ActiveDescendantKeyManager<MatOption>(this.options).withWrap();
    // Set the initial visibility state.
    this._setVisibility();
  }

  /**
   * Sets the panel scrollTop. This allows us to manually scroll to display options
   * above or below the fold, as they are not actually being focused when active.
   */
  _setScrollTop(scrollTop: number): void {
    if (this.panel) {
      this.panel.nativeElement.scrollTop = scrollTop;
    }
  }

  /** Returns the panel's scrollTop. */
  _getScrollTop(): number {
    return this.panel ? this.panel.nativeElement.scrollTop : 0;
  }

  /** Panel should hide itself when the option list is empty. */
  _setVisibility() {
    this.showPanel = !!this.options.length;
    this._classList['mat-autocomplete-visible'] = this.showPanel;
    this._classList['mat-autocomplete-hidden'] = !this.showPanel;
    
    // @FNB
    if (!this.selfChangeDetection) {
        this._changeDetectorRef.markForCheck();
    } else {
        try {
          this._changeDetectorRef.detectChanges();
        } catch(err) {
             // Prevent from showing this possible error:
             // Error: ViewDestroyedError: Attempt to use a destroyed view: detectChanges
        }
    }
    
}

  /** Emits the `select` event. */
  _emitSelectEvent(option: MatOption): void {
    const event = new MatAutocompleteSelectedEvent(this, option);
    this.optionSelected.emit(event);
  }
}

